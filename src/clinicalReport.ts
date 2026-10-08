import { fields, type RecordData, type FieldId } from "./intake.ts";

export const summarySections: { title: string; ids: FieldId[] }[] = [
  {
    title: "Presenting concern and course",
    ids: [
      "reason",
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
    title: "Function and patient goals",
    ids: ["functionalLimitations", "occupation", "exercise", "goals"],
  },
  {
    title: "Medical and family context",
    ids: [
      "history",
      "familyHistory",
      "surgeries",
      "hospitalizations",
      "priorInjuries",
      "priorTreatment",
      "imaging",
      "medications",
      "allergies",
    ],
  },
  {
    title: "Lifestyle and care team",
    ids: [
      "sleep",
      "nutrition",
      "tobacco",
      "alcohol",
      "substances",
      "pcp",
      "specialists",
      "referral",
      "additionalConcerns",
    ],
  },
];
export function buildMedicalSummary(data: RecordData) {
  return {
    reason: data.reason?.value || null,
    sections: summarySections.map((section) => ({
      ...section,
      entries: section.ids.flatMap((id) => {
        const answer = data[id];
        const field = fields.find((f) => f.id === id)!;
        return answer?.value
          ? [
              {
                id,
                label: field.label,
                value: answer.value,
                source: answer.source,
                confirmed: answer.confirmed,
              },
            ]
          : [];
      }),
      missing: section.ids.filter((id) => !data[id]?.value),
    })),
  };
}
export function canDiscussServices(
  reviewed: boolean,
  interested: boolean,
  safety: boolean | null,
  conflictCount: number,
  reason: string,
) {
  return (
    reviewed &&
    interested &&
    safety === false &&
    conflictCount === 0 &&
    Boolean(reason.trim())
  );
}

// Website catalog only. No efficacy, eligibility, pricing, or automated treatment claims.
export const clinicServices = [
  ["Chiropractic & Physical Therapy", "chiropractic-and-physical-therapy"],
  ["Personal Injury", "personal-injury"],
  ["Weight Loss Programs", "weight-loss-programs"],
  ["Brain Health", "brain-health"],
  ["Regenerative Medicine", "regenerative-medicine"],
  ["IV Therapy", "iv-therapy"],
  ["Anti Aging Medicine", "anti-aging-medicine"],
  ["Aesthetic Treatments", "aesthetic-treatments"],
  ["Biohacking & Optimization", "biohacking-and-optimization"],
].map(([name, slug]) => ({
  name,
  url: `https://www.innovativemedicalwellness.com/en/${slug}`,
}));
