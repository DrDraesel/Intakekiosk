import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  connectorConfig,
  verifyInvite,
  validateIntake,
  deliverIntake,
} from "../api/_lib/delivery.js";
import { fields, type RecordData } from "../src/intake.ts";
import { makeSummaries } from "../src/flow.ts";
import { labFlowPayload } from "../api/_lib/delivery.js";
import { buildSubmission } from "../src/missionControl.ts";

test("LabFlow adapter preserves legacy identity and field mapping and adds both reviewed summaries without raw transcript", () => {
  const body = intake();
  const validated = validateIntake(body)!;
  const legacy = buildSubmission({
    id: body.submissionId,
    locale: body.locale,
    category: "Patient intake",
    attention: false,
    data: body.answers,
    segments: [],
  });
  const adapted = labFlowPayload(validated, "fictional-session-1234");
  assert.deepEqual(adapted.patient, legacy.patient);
  assert.equal(adapted.fields.reason.value, legacy.fields.reason.value);
  assert.equal(adapted.id, legacy.id);
  assert.deepEqual(adapted.summaries, body.summaries);
  assert.deepEqual(adapted.transcript, []);
});
const env = {
  INTAKE_LIVE_ENABLED: "true",
  EHR_CONNECTOR_URL: "https://ehr.example.com/intakes",
  EHR_CONNECTOR_HOST: "ehr.example.com",
  EHR_CONNECTOR_TOKEN: "synthetic-secret",
  INTAKE_SESSION_SECRET: "x".repeat(40),
  INTAKE_PUBLIC_ORIGIN: "https://clinic.example.com",
};
function invite(exp = Math.floor(Date.now() / 1000) + 600) {
  const claim = Buffer.from(
    JSON.stringify({
      aud: "imw-intake",
      sessionId: "fictional-session-1234",
      exp,
    }),
  ).toString("base64url");
  return (
    claim +
    "." +
    createHmac("sha256", env.INTAKE_SESSION_SECRET)
      .update(claim)
      .digest("base64url")
  );
}
function intake() {
  const data: RecordData = {};
  for (const f of fields.filter((f) => f.required))
    data[f.id] = {
      value: f.id === "reason" ? "Fictional concern" : "Unknown",
      source: "Fictional test",
      confirmed: true,
      timestamp: new Date().toISOString(),
    };
  return {
    version: 1,
    submissionId: "b9df4125-40e5-42a4-87cd-1719286b9931",
    locale: "en",
    answers: data,
    summaries: makeSummaries(data, "en"),
    confirmation: {
      reviewed: true,
      share: true,
      confirmedAt: new Date().toISOString(),
    },
    immediateAttention: false,
  };
}
function req() {
  const body = intake();
  return {
    body,
    headers: {
      origin: env.INTAKE_PUBLIC_ORIGIN,
      authorization: "Bearer " + invite(),
      "content-type": "application/json",
      "idempotency-key": body.submissionId,
    },
  };
}
test("unconfigured, unsigned, expired, cross-origin and unsafe destinations cannot send patient information", async () => {
  let calls = 0;
  const request = async () => {
    calls++;
    throw Error("must not send");
  };
  assert.equal((await deliverIntake(req(), {}, request)).code, 503);
  for (const change of [
    { authorization: "" },
    { authorization: "Bearer " + invite(1) },
    { origin: "https://other.example.com" },
  ])
    assert.ok(
      (
        await deliverIntake(
          { ...req(), headers: { ...req().headers, ...change } },
          env,
          request,
        )
      ).code >= 400,
    );
  for (const url of [
    "http://ehr.example.com/intakes",
    "https://other.example.com",
    "https://ehr.example.com/redirect?target=example",
    "https://user:password@ehr.example.com",
  ])
    assert.equal(connectorConfig({ ...env, EHR_CONNECTOR_URL: url }), null);
  assert.equal(
    verifyInvite(invite() + "corrupt", env.INTAKE_SESSION_SECRET),
    null,
  );
  assert.equal(calls, 0);
});
test("validation requires consent, complete required answers, exact reviewed summaries and patient provenance", () => {
  const body = intake();
  assert.ok(validateIntake(body));
  const noConsent = structuredClone(body);
  noConsent.confirmation.share = false;
  assert.equal(validateIntake(noConsent), null);
  const missing = structuredClone(body);
  delete missing.answers.reason;
  assert.equal(validateIntake(missing), null);
  const fabricated = structuredClone(body);
  fabricated.summaries.doctor.connectedRecords.status = "verified";
  assert.equal(validateIntake(fabricated), null);
  const changed = structuredClone(body);
  changed.answers.reason!.value = "Changed after review";
  assert.equal(validateIntake(changed), null);
});
test("delivery requires a real receipt and retries reuse a session-scoped idempotency key", async () => {
  const keys: string[] = [];
  const request = async (_url: unknown, options: any) => {
    keys.push(options.headers["Idempotency-Key"]);
    assert.equal(options.redirect, "error");
    assert.ok(!options.body.includes("ciphertext"));
    return {
      ok: true,
      json: async () => ({ status: "accepted", receiptId: "TEST-123" }),
    };
  };
  const first = await deliverIntake(req(), env, request);
  const second = await deliverIntake(req(), env, request);
  assert.equal(first.code, 200);
  assert.deepEqual(first, second);
  assert.equal(keys[0], keys[1]);
  assert.equal(
    (
      await deliverIntake(req(), env, async () => ({
        ok: true,
        json: async () => ({}),
      }))
    ).code,
    502,
  );
  assert.equal(
    (
      await deliverIntake(req(), env, async () => {
        throw Error("timeout");
      })
    ).code,
    502,
  );
});
