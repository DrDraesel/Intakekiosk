import test from "node:test";
import assert from "node:assert/strict";
import { fields, type RecordData } from "../src/intake.ts";
import {
  intakeSections,
  answerStatus,
  followUps,
  makeSummaries,
} from "../src/flow.ts";
import { sealDraft, openDraft } from "../src/privateDraft.ts";
import { glassCatalog, glassText } from "../src/locales/glass.ts";
import { translate } from "../src/i18n.ts";
import { readFileSync } from "node:fs";
import ts from "typescript";
test("navigator covers every question exactly once and distinguishes unanswered, incomplete, complete and conflicts", () => {
  const ids = intakeSections.flatMap((s) => s.ids);
  assert.equal(ids.length, fields.length);
  assert.equal(new Set(ids).size, ids.length);
  const data: RecordData = {
    reason: {
      value: "Maybe a knee injury",
      source: "Maybe a knee injury",
      confirmed: false,
      timestamp: "",
    },
  };
  assert.equal(answerStatus(data, "reason"), "Incomplete");
  assert.equal(answerStatus(data, "allergies"), "Unanswered");
  data.reason!.confirmed = true;
  assert.equal(answerStatus(data, "reason"), "Complete");
  assert.equal(answerStatus(data, "reason", ["reason"]), "Needs confirmation");
});
test("follow-ups ask for missing timeline, function and uncertainty without inventing facts", () => {
  const data: RecordData = {
    reason: {
      value: "Maybe my knee hurts",
      source: "Maybe my knee hurts",
      confirmed: false,
      timestamp: "",
    },
  };
  const prompts = followUps(data);
  assert.ok(prompts.some((p) => p.id === "onset"));
  assert.ok(prompts.some((p) => p.id === "functionalLimitations"));
  assert.ok(
    prompts.some((p) => p.id === "reason" && p.prompt.includes("uncertain")),
  );
  assert.equal(Object.keys(data).length, 1);
});
test("both summaries preserve originals and never claim connected-record verification", () => {
  const data: RecordData = {
    reason: {
      value: "Болит колено",
      source: "Болит колено",
      confirmed: true,
      timestamp: "",
    },
  };
  const result = makeSummaries(data, "ru");
  assert.equal(result.patient.reason, "Болит колено");
  assert.equal(result.doctor.chiefComplaint, "Болит колено");
  assert.deepEqual(result.doctor.connectedRecords, {
    status: "not_connected",
    verifiedFacts: [],
  });
  assert.equal(result.doctor.diagnosis, null);
  assert.ok(
    result.doctor.answers.every((a) => a.provenance === "patient_reported"),
  );
  assert.ok(result.doctor.unanswered.includes("Allergies"));
});
test("encrypted drafts round-trip, reject wrong passphrases and tampering and contain no plaintext patient words", async () => {
  const draft = {
    data: { reason: { value: "Fictional confidential concern" } },
  };
  const passphrase = "fictional test passphrase";
  const encrypted = await sealDraft(draft, passphrase);
  assert.ok(!encrypted.includes("confidential"));
  assert.deepEqual(await openDraft(encrypted, passphrase), draft);
  await assert.rejects(openDraft(encrypted, "different passphrase"));
  await assert.rejects(sealDraft(draft, "short"));
  const corrupt = JSON.parse(encrypted);
  corrupt.ciphertext =
    (corrupt.ciphertext[0] === "A" ? "B" : "A") + corrupt.ciphertext.slice(1);
  await assert.rejects(openDraft(JSON.stringify(corrupt), passphrase));
});
test("Glassworth-style UI literals and section labels retain Spanish and Russian translations", () => {
  const source = ts.createSourceFile(
    "GlassIntake.tsx",
    readFileSync(new URL("../src/GlassIntake.tsx", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const messages = new Set(Object.keys(glassCatalog));
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "t"
    ) {
      function literals(n: ts.Node) {
        if (ts.isConditionalExpression(n)) {
          literals(n.whenTrue);
          literals(n.whenFalse);
          return;
        }
        if (ts.isStringLiteral(n) && /[A-Za-z]/.test(n.text))
          messages.add(n.text);
      }
      node.arguments.forEach(literals);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  const missing: string[] = [];
  for (const message of messages)
    for (const locale of ["es", "ru"] as const)
      if (
        glassText(message, locale, translate) === message &&
        !(message === "No" && locale === "es")
      )
        missing.push(`${locale}: ${message}`);
  assert.deepEqual(missing, []);
  for (const section of intakeSections)
    for (const locale of ["es", "ru"] as const)
      assert.notEqual(
        glassText(section.title, locale, translate),
        section.title,
      );
});
