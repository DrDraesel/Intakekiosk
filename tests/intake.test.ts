import test from "node:test";
import assert from "node:assert/strict";
import { extract, propose, SAMPLE } from "../src/intake.ts";
import { healthFields, HEALTH_SAMPLE } from "../src/health.ts";
test("one out-of-order narrative fills identity, story, and history", () => {
  const result = Object.fromEntries(
    extract(SAMPLE).map((c) => [c.id, c.value]),
  );
  assert.equal(result.name, "Maria Lopez");
  assert.equal(result.location, "knee");
  assert.equal(result.side, "left");
  assert.equal(result.severity, "7");
  assert.equal(result.onset, "Monday");
  assert.equal(result.medications, "acetaminophen");
  assert.equal(result.allergies, "penicillin");
  assert.equal(result.goals, "get back to walking comfortably");
});
test("conflicts are proposed rather than overwriting prior answers", () => {
  const result = propose(
    {
      severity: {
        value: "7",
        source: "original",
        confirmed: true,
        timestamp: "",
      },
    },
    extract("The pain is three out of ten."),
  );
  assert.equal(result.updates.length, 0);
  assert.equal(result.conflicts[0].value, "3");
});
test("unknown narratives do not fabricate values", () => {
  assert.deepEqual(extract("I would rather talk to my doctor about this."), []);
});
test("negative answers are explicit", () => {
  assert.equal(extract("I have no known allergies.")[0].value, "None reported");
});
test("text is returned as data, including markup", () => {
  assert.equal(
    extract("My medical history is <script>alert(1)</script>.")[0].value,
    "<script>alert(1)</script>",
  );
});
test("incidental anatomy does not fill pain location", () => {
  assert.equal(
    extract("My knee was examined last year.").some((c) => c.id === "location"),
    false,
  );
});
test("denial of a specific allergy is not an allergy", () => {
  assert.equal(
    extract("I am not allergic to penicillin.").some(
      (c) => c.id === "allergies",
    ),
    false,
  );
});
test("family statements preserve multiple relatives separately from patient history", () => {
  const result = Object.fromEntries(
    extract(
      "My mother has diabetes and my father had a heart attack at age fifty.",
    ).map((c) => [c.id, c.value]),
  );
  assert.match(result.familyHistory, /mother has diabetes/);
  assert.match(result.familyHistory, /father had a heart attack at age fifty/);
  assert.equal(result.history, undefined);
});
test("family pain is not assigned to the patient's pain fields", () => {
  const result = extract("My mother has sharp pain in her left knee.");
  assert.deepEqual(
    result.map((c) => c.id),
    ["familyHistory"],
  );
});
test("an explicitly selected question captures natural answers", () => {
  assert.equal(
    extract("My dad was diagnosed with diabetes at 55.", "familyHistory")[0].id,
    "familyHistory",
  );
  assert.equal(
    extract("An appendectomy in 2012", "surgeries")[0].value,
    "An appendectomy in 2012",
  );
});
test("explicit out-of-order answers take precedence over the displayed question", () => {
  const result = extract("I take metformin.", "familyHistory");
  assert.deepEqual(
    result.map((c) => c.id),
    ["medications"],
  );
});
test("unknown, declined, and negative answers retain different values", () => {
  assert.equal(extract("Unknown", "familyHistory")[0].value, "Unknown");
  assert.equal(
    extract("Prefer not to answer", "familyHistory")[0].value,
    "Prefer not to answer",
  );
  assert.equal(
    extract("None reported", "familyHistory")[0].value,
    "None reported",
  );
});
test("provider history sample fills the new domains", () => {
  const result = Object.fromEntries(
    extract(HEALTH_SAMPLE).map((c) => [c.id, c.value]),
  );
  for (const id of [
    "familyHistory",
    "surgeries",
    "hospitalizations",
    "tobacco",
    "pcp",
    "sleep",
  ])
    assert.ok(result[id], id);
});
test("question registry has unique canonical fields", () => {
  assert.equal(
    new Set(healthFields.map((f) => f.id)).size,
    healthFields.length,
  );
  assert.ok(
    healthFields.every((f) => f.question && f.topic && f.group === "health"),
  );
});
test("care-team contact details are not assigned to the patient", () => {
  const result = Object.fromEntries(
    extract(
      "My primary care provider is Dr. Alex Rivera, phone is 202-555-0142, email alex@example.com.",
    ).map((c) => [c.id, c.value]),
  );
  assert.match(result.pcp, /Dr\. Alex Rivera/);
  assert.equal(result.phone, undefined);
  assert.equal(result.email, undefined);
});
test("family birth dates do not replace patient birth dates", () => {
  const result = extract("My father was born January 15, 1950.");
  assert.equal(
    result.some((c) => c.id === "dob"),
    false,
  );
});
