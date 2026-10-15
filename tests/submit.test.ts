import test from "node:test";
import assert from "node:assert/strict";
import { buildSubmission, submitIntake } from "../src/missionControl.ts";

const data = {
  name: { value: "Alex Morgan", source: "sample", confirmed: true, timestamp: "t" },
  dob: { value: "1982-04-17", source: "sample", confirmed: true, timestamp: "t" },
  phone: { value: "555-0101", source: "sample", confirmed: false, timestamp: "t" },
  reason: { value: "Lower back pain", source: "voice", confirmed: true, timestamp: "t" },
};

test("buildSubmission maps captured fields and patient identity", () => {
  const submission = buildSubmission({
    id: "IMW-TEST0001",
    locale: "en",
    category: "Chiropractic",
    attention: false,
    data,
    segments: [
      { original: "My name is Alex", timestamp: "t", source: "voice", questionId: null },
    ],
  });
  assert.equal(submission.patient.name, "Alex Morgan");
  assert.equal(submission.patient.dob, "1982-04-17");
  assert.equal(submission.patient.phone, "555-0101");
  assert.equal(submission.fields.reason.value, "Lower back pain");
  assert.equal(submission.fields.phone.confirmed, false);
  assert.equal(submission.transcript.length, 1);
  assert.equal(submission.attention, false);
  assert.equal(submission.locale, "en");
});

test("buildSubmission ignores empty entries and defaults missing fields", () => {
  const submission = buildSubmission({
    id: "IMW-TEST0002",
    locale: "es",
    category: "X",
    attention: true,
    data: { name: { value: "Jordan Lee", source: "text", confirmed: false, timestamp: "t" } },
    segments: [],
  });
  assert.equal(submission.patient.name, "Jordan Lee");
  assert.equal(submission.patient.phone, "");
  assert.equal(submission.fields.name.value, "Jordan Lee");
  assert.equal(submission.attention, true);
});

test("submitIntake posts JSON and reports success without throwing", async () => {
  let captured: { url: string; init?: RequestInit } = { url: "" };
  const fakeFetch: typeof fetch = async (url, init) => {
    captured = { url: String(url), init: init ?? undefined };
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const submission = buildSubmission({
    id: "IMW-TEST0003",
    locale: "en",
    category: "X",
    attention: true,
    data,
    segments: [],
  });
  const outcome = await submitIntake(submission, {
    endpoint: "http://127.0.0.1:9090/api/intake",
    fetchImpl: fakeFetch,
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.status, 200);
  assert.equal(captured.url, "http://127.0.0.1:9090/api/intake");
  assert.equal(captured.init?.method, "POST");
  assert.match(String(captured.init?.body), /IMW-TEST0003/);
  assert.match(String(captured.init?.body), /Alex Morgan/);
});

test("submitIntake reports failure instead of throwing", async () => {
  const submission = buildSubmission({
    id: "IMW-TEST0004",
    locale: "en",
    category: "X",
    attention: false,
    data,
    segments: [],
  });
  const outcome = await submitIntake(submission, {
    fetchImpl: async () => {
      throw new Error("connection refused");
    },
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.error, "connection refused");
});

test("submitIntake reports a non-2xx response as failure", async () => {
  const submission = buildSubmission({
    id: "IMW-TEST0005",
    locale: "en",
    category: "X",
    attention: false,
    data,
    segments: [],
  });
  const outcome = await submitIntake(submission, {
    fetchImpl: async () => new Response("bad request", { status: 400 }),
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.status, 400);
});
