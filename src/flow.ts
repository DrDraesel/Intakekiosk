import { fields, type RecordData, type FieldId } from "./intake.ts";
export const intakeSections = [
  { id: "visit", title: "Reason for your visit", ids: ["reason", "goals"] },
  {
    id: "symptoms",
    title: "Symptoms & timeline",
    ids: [
      "location",
      "side",
      "onset",
      "severity",
      "quality",
      "aggravating",
      "relieving",
      "currentSymptoms",
      "ros",
    ],
  },
  {
    id: "medical",
    title: "Medical & surgical history",
    ids: [
      "history",
      "surgeries",
      "hospitalizations",
      "priorInjuries",
      "priorTreatment",
      "imaging",
    ],
  },
  {
    id: "medications",
    title: "Medications & allergies",
    ids: ["medications", "allergies"],
  },
  { id: "family", title: "Family history", ids: ["familyHistory"] },
  {
    id: "social",
    title: "Daily life & social history",
    ids: [
      "occupation",
      "exercise",
      "sleep",
      "nutrition",
      "tobacco",
      "alcohol",
      "substances",
      "functionalLimitations",
    ],
  },
  {
    id: "care",
    title: "Care team & other concerns",
    ids: ["pcp", "specialists", "referral", "additionalConcerns"],
  },
  {
    id: "about",
    title: "About you",
    ids: ["name", "dob", "phone", "email", "address", "insurance", "memberId"],
  },
] as const;
export function uncertain(value: string) {
  return /\b(?:maybe|not sure|unsure|possibly|approximately|quizás|tal vez|no estoy segur[oa])\b|возможно|не уверен|примерно/iu.test(
    value,
  );
}
export function answerStatus(
  data: RecordData,
  id: FieldId,
  conflicts: FieldId[] = [],
) {
  return conflicts.includes(id)
    ? "Needs confirmation"
    : !data[id]?.value
      ? "Unanswered"
      : data[id]?.confirmed
        ? "Complete"
        : "Incomplete";
}
export function followUps(data: RecordData) {
  const out: { id: FieldId; prompt: string }[] = [];
  const add = (id: FieldId, prompt: string) => out.push({ id, prompt });
  if (!data.reason?.value)
    add("reason", "What is the main concern you would like help with today?");
  if (data.reason?.value && !data.onset?.value)
    add("onset", "When did this concern begin, and has it changed since then?");
  if (data.reason?.value && !data.functionalLimitations?.value)
    add(
      "functionalLimitations",
      "How does this affect your daily activities or work?",
    );
  for (const f of fields) {
    const value = data[f.id]?.value;
    if (value && uncertain(value) && !data[f.id]?.confirmed)
      add(
        f.id,
        "This answer sounds uncertain. Please clarify what you know, or confirm that you are unsure.",
      );
    else if (f.required && !value && !out.some((x) => x.id === f.id))
      add(f.id, f.question || f.placeholder);
  }
  return out;
}
export function makeSummaries(data: RecordData, locale: string) {
  const entries = fields.flatMap((f) =>
    data[f.id]?.value
      ? [
          {
            id: f.id,
            label: f.label,
            value: data[f.id]!.value,
            provenance: "patient_reported" as const,
            reviewed: data[f.id]!.confirmed,
          },
        ]
      : [],
  );
  return {
    patient: { locale, reason: data.reason?.value || null, answers: entries },
    doctor: {
      chiefComplaint: data.reason?.value || null,
      answers: entries,
      unanswered: fields.filter((f) => !data[f.id]?.value).map((f) => f.label),
      connectedRecords: { status: "not_connected", verifiedFacts: [] },
      diagnosis: null,
    },
  };
}
