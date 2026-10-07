import test from "node:test";
import assert from "node:assert/strict";
import { extract, propose, SAMPLE } from "../src/intake.ts";
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
