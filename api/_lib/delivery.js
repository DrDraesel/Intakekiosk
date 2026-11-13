import { createHmac, timingSafeEqual } from "node:crypto";
import fields from "../../src/fieldContract.json" with { type: "json" };

export function connectorConfig(env) {
  try {
    const url = new URL(env.EHR_CONNECTOR_URL || "");
    const host = env.EHR_CONNECTOR_HOST;
    if (
      env.INTAKE_LIVE_ENABLED !== "true" ||
      !host ||
      url.hostname !== host ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      url.search ||
      !host.includes(".") ||
      /^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(
        host,
      ) ||
      /\.(?:local|internal)$/.test(host) ||
      !env.EHR_CONNECTOR_TOKEN ||
      !env.INTAKE_SESSION_SECRET ||
      env.INTAKE_SESSION_SECRET.length < 32 ||
      !env.INTAKE_PUBLIC_ORIGIN
    )
      return null;
    const origin = new URL(env.INTAKE_PUBLIC_ORIGIN);
    if (
      origin.protocol !== "https:" ||
      origin.origin !== env.INTAKE_PUBLIC_ORIGIN
    )
      return null;
    return {
      url,
      origin: origin.origin,
      name: (env.EHR_CONNECTOR_NAME || "Clinic connector").slice(0, 80),
    };
  } catch {
    return null;
  }
}
export function verifyInvite(token, secret, now = Date.now()) {
  try {
    if (typeof token !== "string" || token.length > 4096) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const expected = createHmac("sha256", secret).update(parts[0]).digest();
    const supplied = Buffer.from(parts[1], "base64url");
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      return null;
    const claim = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf8"),
    );
    if (
      claim.aud !== "imw-intake" ||
      typeof claim.sessionId !== "string" ||
      !/^[a-zA-Z0-9-]{16,80}$/.test(claim.sessionId) ||
      !Number.isSafeInteger(claim.exp) ||
      claim.exp <= Math.floor(now / 1000) ||
      claim.exp > Math.floor(now / 1000) + 86400
    )
      return null;
    return claim;
  } catch {
    return null;
  }
}
export function validateIntake(body) {
  // Both receiver formats use this same consent and patient-provenance validation.
  if (
    !body ||
    body.version !== 1 ||
    !["en", "es", "ru"].includes(body.locale) ||
    typeof body.submissionId !== "string" ||
    !/^[-a-f0-9]{36}$/i.test(body.submissionId) ||
    typeof body.immediateAttention !== "boolean" ||
    body.confirmation?.reviewed !== true ||
    body.confirmation?.share !== true ||
    typeof body.confirmation?.confirmedAt !== "string" ||
    !Number.isFinite(Date.parse(body.confirmation.confirmedAt))
  )
    return null;
  if (
    !body.answers ||
    typeof body.answers !== "object" ||
    Array.isArray(body.answers) ||
    Object.keys(body.answers).some((id) => !fields.some((f) => f.id === id))
  )
    return null;
  const answers = {};
  for (const f of fields) {
    const a = body.answers[f.id];
    if (!a) {
      if (f.required) return null;
      continue;
    }
    if (
      typeof a.value !== "string" ||
      !a.value.trim() ||
      a.value.length > 5000 ||
      typeof a.source !== "string" ||
      a.source.length > 15000 ||
      a.confirmed !== true
    )
      return null;
    answers[f.id] = {
      value: a.value,
      source: a.source,
      confirmed: true,
      provenance: "patient_reported",
    };
  }
  const entries = fields.flatMap((f) =>
    answers[f.id]
      ? [
          {
            id: f.id,
            label: f.label,
            value: answers[f.id].value,
            provenance: "patient_reported",
            reviewed: true,
          },
        ]
      : [],
  );
  // Rebuild authoritative summaries. Never accept client-supplied diagnoses or record verification claims.
  const summaries = {
    patient: {
      locale: body.locale,
      reason: answers.reason?.value || null,
      answers: entries,
    },
    doctor: {
      chiefComplaint: answers.reason?.value || null,
      answers: entries,
      unanswered: fields.filter((f) => !answers[f.id]).map((f) => f.label),
      connectedRecords: { status: "not_connected", verifiedFacts: [] },
      diagnosis: null,
    },
  };
  if (JSON.stringify(body.summaries) !== JSON.stringify(summaries)) return null;
  return {
    version: 1,
    submissionId: body.submissionId,
    locale: body.locale,
    answers,
    summaries,
    confirmation: {
      reviewed: true,
      share: true,
      confirmedAt: body.confirmation.confirmedAt,
    },
    immediateAttention: body.immediateAttention,
  };
}
export function labFlowPayload(intake, sessionId) {
  const pick = (id) => intake.answers[id]?.value || "";
  return {
    id: intake.submissionId,
    submittedAt: intake.confirmation.confirmedAt,
    locale: intake.locale,
    category: "Patient intake",
    attention: intake.immediateAttention,
    patient: Object.fromEntries(
      ["name", "dob", "phone", "email", "address", "insurance", "memberId"].map(
        (id) => [id, pick(id)],
      ),
    ),
    fields: Object.fromEntries(
      Object.entries(intake.answers).map(([id, a]) => [
        id,
        {
          value: a.value,
          confirmed: true,
          source: a.source,
          timestamp: intake.confirmation.confirmedAt,
        },
      ]),
    ),
    transcript: [],
    summaries: intake.summaries,
    confirmation: intake.confirmation,
    sessionId,
  };
}
export async function deliverIntake(req, env, request = fetch) {
  const config = connectorConfig(env);
  if (!config) return { code: 503, body: { status: "not_configured" } };
  if (req.headers.origin !== config.origin)
    return { code: 403, body: { status: "forbidden" } };
  const invite = verifyInvite(
    (req.headers.authorization || "").replace(/^Bearer /, ""),
    env.INTAKE_SESSION_SECRET,
  );
  if (!invite) return { code: 401, body: { status: "invitation_required" } };
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || ""))
    return { code: 415, body: { status: "invalid_content_type" } };
  const raw =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  if (!raw || Buffer.byteLength(raw) > 250000)
    return { code: 413, body: { status: "invalid_payload" } };
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(raw) : req.body;
  } catch {
    return { code: 400, body: { status: "invalid_payload" } };
  }
  const intake = validateIntake(body);
  if (!intake || req.headers["idempotency-key"] !== intake.submissionId)
    return { code: 400, body: { status: "invalid_payload" } };
  const idempotencyKey = createHmac("sha256", env.INTAKE_SESSION_SECRET)
    .update(`${invite.sessionId}:${intake.submissionId}`)
    .digest("hex");
  try {
    const response = await request(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.EHR_CONNECTOR_TOKEN}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(
        env.EHR_CONNECTOR_FORMAT === "labflow"
          ? labFlowPayload(intake, invite.sessionId)
          : { ...intake, sessionId: invite.sessionId },
      ),
      redirect: "error",
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok)
      return { code: 502, body: { status: "delivery_unconfirmed" } };
    const receipt = await response.json();
    if (
      receipt.status !== "accepted" ||
      typeof receipt.receiptId !== "string" ||
      !/^[a-zA-Z0-9_.:-]{1,120}$/.test(receipt.receiptId)
    )
      return { code: 502, body: { status: "delivery_unconfirmed" } };
    return {
      code: 200,
      body: { status: "accepted", receiptId: receipt.receiptId },
    };
  } catch {
    return { code: 502, body: { status: "delivery_unconfirmed" } };
  }
}
