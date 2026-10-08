import test from "node:test";
import assert from "node:assert/strict";
import messages from "../src/locales/en.json" with { type: "json" };
import { catalog, translate, speechLocales } from "../src/i18n.ts";
import { extractLocalized } from "../src/multilingual.ts";
import { fields, SAMPLE, propose } from "../src/intake.ts";
import { healthFields, HEALTH_SAMPLE } from "../src/health.ts";
import React from "react";
import { localizeTree } from "../src/LocalizedTree.ts";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("UI translation preserves patient text, event handlers, and canonical option values", () => {
  const handler = () => undefined;
  const original = React.createElement(
    "button",
    { onClick: handler, "aria-label": "Reviewed" },
    React.createElement("span", { translate: "no" }, "Unknown"),
    React.createElement(
      "option",
      { value: "familyHistory" },
      "Family medical history",
    ),
  );
  const result = localizeTree(original, "ru") as React.ReactElement<any>;
  assert.equal(result.props.onClick, handler);
  assert.equal(result.props["aria-label"], "Проверено");
  assert.equal(result.props.children[0].props.children, "Unknown");
  assert.equal(result.props.children[1].props.value, "familyHistory");
  assert.equal(
    result.props.children[1].props.children,
    "Семейный медицинский анамнез",
  );
});
test("all rendered English JSX text has catalog coverage", () => {
  const source = readFileSync(
    new URL("../src/main.tsx", import.meta.url),
    "utf8",
  );
  const sf = ts.createSourceFile(
    "main.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const branding = new Set([
    "IMW",
    "INNOVATIVE MEDICAL",
    "WELLNESS",
    "English",
    "Español",
    "Language · Idioma · Язык",
  ]);
  function walk(node: ts.Node) {
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, " ").trim();
      if (/[A-Za-z]/.test(text) && !branding.has(text))
        assert.ok(catalog[text], `Untranslated JSX: ${text}`);
    }
    ts.forEachChild(node, walk);
  }
  walk(sf);
});

test("every patient UI catalog message has Spanish and Russian translations", () => {
  const exempt = new Set([18, 36, 37, 38, 108, 128, 245]); // punctuation and registered clinic branding
  messages.forEach((message, index) => {
    if (exempt.has(index)) return;
    assert.ok(catalog[message]?.es, `Missing Spanish: ${message}`);
    assert.ok(catalog[message]?.ru, `Missing Russian: ${message}`);
  });
  for (const locale of ["es", "ru"] as const) {
    for (const field of fields) {
      assert.notEqual(translate(field.label, locale), field.label);
      if (field.placeholder !== "you@example.com")
        assert.notEqual(
          translate(field.placeholder, locale),
          field.placeholder,
        );
    }
    for (const field of healthFields)
      assert.notEqual(translate(field.question!, locale), field.question);
  }
});
test("speech recognition and playback use explicit locale tags", () => {
  assert.deepEqual(speechLocales, { en: "en-US", es: "es-US", ru: "ru-RU" });
});
for (const locale of ["es", "ru"] as const) {
  test(`${locale} sample maps identity, medications, allergy and pain fields with native evidence`, () => {
    const text = translate(SAMPLE, locale);
    const answers = extractLocalized(text, null, locale);
    for (const id of [
      "name",
      "reason",
      "location",
      "side",
      "onset",
      "severity",
      "quality",
      "aggravating",
      "relieving",
      "medications",
      "allergies",
      "goals",
    ])
      assert.ok(
        answers.some((a) => a.id === id),
        `Missing ${id}: ${text}`,
      );
    assert.equal(answers.find((a) => a.id === "severity")?.value, "7");
    for (const answer of answers) assert.equal(answer.source, text);
  });
  test(`${locale} family sample separates relatives from patient history and preserves provider name`, () => {
    const text = translate(HEALTH_SAMPLE, locale);
    const answers = extractLocalized(text, null, locale);
    for (const id of [
      "familyHistory",
      "surgeries",
      "hospitalizations",
      "tobacco",
      "pcp",
      "sleep",
    ])
      assert.ok(
        answers.some((a) => a.id === id),
        `Missing ${id}`,
      );
    assert.equal(
      answers.some((a) => a.id === "history"),
      false,
    );
    assert.equal(
      answers.some((a) => a.id === "name"),
      false,
    );
    assert.equal(
      answers
        .find((a) => a.id === "familyHistory")
        ?.value.includes(locale === "es" ? "padre" : "отца"),
      true,
    );
  });
  test(`${locale} unknown and declined answers stay distinct and do not become negative history`, () => {
    for (const word of ["Unknown", "Prefer not to answer", "None reported"]) {
      const text = translate(word, locale);
      assert.equal(
        extractLocalized(text, "familyHistory", locale)[0].value,
        text,
      );
    }
  });
  test(`${locale} a medication answer takes precedence over the displayed family question`, () => {
    const text =
      locale === "es"
        ? "Tomo metformina diariamente."
        : "Я принимаю метформин ежедневно.";
    const answers = extractLocalized(text, "familyHistory", locale);
    assert.equal(answers[0].id, "medications");
    assert.equal(
      answers.some((a) => a.id === "familyHistory"),
      false,
    );
    const current = {
      medications: {
        value: "existing",
        source: "existing",
        confirmed: true,
        timestamp: "test",
      },
    };
    assert.equal(propose(current, answers).conflicts.length, 1);
  });
  test(`${locale} localized dynamic acknowledgments contain no English UI labels`, () => {
    const text = translate(
      "I captured full name, family medical history and 2 more answers. Please review the filled fields. A different answer needs your confirmation.",
      locale,
    );
    assert.equal(
      /I captured|family medical history|full name|Please review|more answers|confirmation/.test(
        text,
      ),
      false,
    );
  });
}
test("unmapped patient statements are not translated or fabricated", () => {
  const original = "У меня очень необычные ощущения, которые трудно описать.";
  assert.equal(translate(original, "es"), original);
  assert.equal(
    extractLocalized(original, "additionalConcerns", "ru")[0].source,
    original,
  );
  assert.equal(extractLocalized(original, null, "ru").length, 0);
});
test("Spanish specific allergy denials preserve the negative statement", () => {
  for (const text of [
    "No soy alérgica a la penicilina.",
    "No tengo alergia al látex.",
  ]) {
    const answer = extractLocalized(text, null, "es").find(
      (answer) => answer.id === "allergies",
    );
    assert.ok(answer?.value.startsWith("No "));
    assert.equal(answer?.source, text);
  }
});
