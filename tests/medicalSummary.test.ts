import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMedicalSummary,
  canDiscussServices,
  clinicServices,
} from "../src/clinicalReport.ts";
import { summaryTranslations } from "../src/locales/summaryTranslations.ts";
import { translate } from "../src/i18n.ts";
test("summary preserves original reports, negatives, review status and evidence without inventing a reason", () => {
  const report = "У моей матери диабет; у меня его нет";
  const data = {
    familyHistory: { value: report, source: report, confirmed: false },
    functionalLimitations: {
      value: "Cannot lift at work",
      source: "I cannot lift at work",
      confirmed: true,
    },
  };
  const summary = buildMedicalSummary(data);
  assert.equal(summary.reason, null);
  const entries = summary.sections.flatMap((s) => s.entries);
  assert.equal(entries.length, 2);
  assert.equal(entries.find((e) => e.id === "familyHistory")?.value, report);
  assert.equal(
    entries.find((e) => e.id === "functionalLimitations")?.source,
    "I cannot lift at work",
  );
  assert.equal(entries.find((e) => e.id === "familyHistory")?.confirmed, false);
  assert.ok(summary.sections.some((s) => s.missing.includes("allergies")));
  assert.equal(
    buildMedicalSummary({
      reason: {
        value: "Discuss weight",
        source: "Discuss weight",
        confirmed: true,
      },
    }).reason,
    "Discuss weight",
  );
});
test("optional services require clinician review, patient interest, a visit reason and no unresolved attention or conflicts", () => {
  assert.equal(canDiscussServices(true, true, false, 0, "Visit concern"), true);
  for (const args of [
    [false, true, false, 0, "reason"],
    [true, false, false, 0, "reason"],
    [true, true, null, 0, "reason"],
    [true, true, true, 0, "reason"],
    [true, true, false, 1, "reason"],
    [true, true, false, 0, "  "],
  ] as const)
    assert.equal(canDiscussServices(...args), false);
});
test("all medical summary and catalog text is localized and catalog links are clinic pages", () => {
  for (const message of Object.keys(summaryTranslations))
    for (const locale of ["es", "ru"] as const)
      assert.notEqual(translate(message, locale), message);
  assert.equal(clinicServices.length, 9);
  assert.ok(
    clinicServices.every((s) =>
      s.url.startsWith("https://www.innovativemedicalwellness.com/en/"),
    ),
  );
});
