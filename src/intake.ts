import { healthFields } from "./health.ts";
export type FieldId =
  | "name"
  | "dob"
  | "phone"
  | "email"
  | "address"
  | "reason"
  | "location"
  | "side"
  | "onset"
  | "severity"
  | "quality"
  | "aggravating"
  | "relieving"
  | "goals"
  | "medications"
  | "allergies"
  | "history"
  | "familyHistory"
  | "surgeries"
  | "hospitalizations"
  | "priorInjuries"
  | "priorTreatment"
  | "imaging"
  | "currentSymptoms"
  | "ros"
  | "tobacco"
  | "alcohol"
  | "substances"
  | "occupation"
  | "exercise"
  | "sleep"
  | "nutrition"
  | "functionalLimitations"
  | "pcp"
  | "specialists"
  | "referral"
  | "additionalConcerns"
  | "insurance"
  | "memberId";
export type Group = "identity" | "story" | "health";
export type Field = {
  id: FieldId;
  label: string;
  group: Group;
  placeholder: string;
  required?: boolean;
  question?: string;
  topic?: string;
};
export const fields: Field[] = [
  {
    id: "name",
    label: "Full name",
    group: "identity",
    placeholder: "Your first and last name",
    required: true,
  },
  {
    id: "dob",
    label: "Date of birth",
    group: "identity",
    placeholder: "Month, day, year",
    required: true,
  },
  {
    id: "phone",
    label: "Phone number",
    group: "identity",
    placeholder: "Your preferred contact number",
    required: true,
  },
  {
    id: "email",
    label: "Email",
    group: "identity",
    placeholder: "you@example.com",
  },
  {
    id: "address",
    label: "Address",
    group: "identity",
    placeholder: "Street, city, state, ZIP",
  },
  {
    id: "insurance",
    label: "Insurance company",
    group: "identity",
    placeholder: "Company or self-pay",
  },
  {
    id: "memberId",
    label: "Member ID",
    group: "identity",
    placeholder: "As shown on your card",
  },
  {
    id: "reason",
    label: "Reason for visit",
    group: "story",
    placeholder: "What brings you in today?",
    required: true,
  },
  {
    id: "location",
    label: "Area of concern",
    group: "story",
    placeholder: "Where do you feel it?",
  },
  {
    id: "side",
    label: "Side",
    group: "story",
    placeholder: "Left, right, or both",
  },
  {
    id: "onset",
    label: "When it started",
    group: "story",
    placeholder: "A date or your own description",
  },
  {
    id: "severity",
    label: "Pain level",
    group: "story",
    placeholder: "0–10, if you are experiencing pain",
  },
  {
    id: "quality",
    label: "What it feels like",
    group: "story",
    placeholder: "Describe it in your words",
  },
  {
    id: "aggravating",
    label: "What makes it worse",
    group: "story",
    placeholder: "Activities or movements",
  },
  {
    id: "relieving",
    label: "What helps",
    group: "story",
    placeholder: "Rest, treatment, or other relief",
  },
  {
    id: "goals",
    label: "Your goal",
    group: "story",
    placeholder: "What would you like to get back to?",
  },
  ...healthFields,
];
export type Candidate = { id: FieldId; value: string; source: string };
export type Captured = {
  value: string;
  source: string;
  confirmed: boolean;
  timestamp: string;
};
export type RecordData = Partial<Record<FieldId, Captured>>;
const numberWords: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};
function clean(s: string) {
  return s
    .trim()
    .replace(/[.,;]+$/, "")
    .trim();
}
// Deliberately bounded, deterministic demo extraction. Unknown language stays in the transcript.
export function extract(text: string, context?: FieldId | null): Candidate[] {
  const out: Candidate[] = [];
  const put = (id: FieldId, value: string | undefined) => {
    if (value && clean(value))
      out.push({ id, value: clean(value), source: text });
  };
  const clauses = text
    .replace(/\b(Dr|Mr|Mrs|Ms|St)\./gi, "$1．")
    .split(
      /[;!?]|\.(?=\s|$)|\b(?:and|but)\b(?=\s+(?:my|I|the|it|walking|rest|I’m|I'm))/i,
    )
    .map((c) => clean(c.replace(/．/g, ".")))
    .filter(Boolean);
  const identityText = clauses
    .filter(
      (c) =>
        !/\b(?:my\s+(?:mother|father|mom|dad|parents|sister|brother|sibling|son|daughter|child|children|grandmother|grandfather|grandparent|aunt|uncle|primary care|PCP|specialist|specialists)|family (?:medical )?history|I was referred by)\b/i.test(
          c,
        ),
    )
    .join(". ");
  const name = identityText.match(
    /\bmy name is\s+([\p{L}'’-]+(?:\s+[\p{L}'’-]+){0,3}?)(?=\s+(?:and|my|I|i'm)\b|[,;.!?]|$)/iu,
  );
  put("name", name?.[1]);
  const born = identityText.match(
    /\b(?:date of birth is|birthday is|born on|born)\s+([^;.!?]+?)(?=\s+and\b|,\s*(?:my|I)\b|$)/i,
  );
  put("dob", born?.[1]);
  const email = identityText.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  put("email", email?.[0]);
  const phone = identityText.match(
    /(?:my phone(?: number)?(?: is)?|my number is|call me at)\s*([+\d()\s-]{7,22})/i,
  );
  put("phone", phone?.[1]);
  for (const c of clauses) {
    const family =
      /\b(?:my\s+(?:mother|father|mom|dad|parents|sister|brother|sibling|son|daughter|child|children|grandmother|grandfather|grandparent|aunt|uncle)|family (?:medical )?history|conditions run in my family)\b/i.test(
        c,
      );
    if (family) {
      put("familyHistory", c);
      continue;
    }
    const narrativePatterns: [FieldId, RegExp][] = [
      [
        "surgeries",
        /\b(?:my surgical history (?:is|includes)|my surgeries (?:are|include)|I had surgery (?:for|on)|I had an? (?:appendectomy|hysterectomy|knee replacement|hip replacement))\b/i,
      ],
      [
        "hospitalizations",
        /\b(?:my hospitalizations (?:are|include)|I was (?:hospitalized|admitted to (?:the |a )?hospital))\b/i,
      ],
      [
        "priorInjuries",
        /\b(?:my previous injuries (?:are|include)|I was previously injured|my prior injuries (?:are|include))\b/i,
      ],
      [
        "priorTreatment",
        /\b(?:my previous treatment (?:was|includes)|I tried|my prior treatment (?:was|includes))\b/i,
      ],
      [
        "imaging",
        /\b(?:my imaging (?:was|includes)|I had (?:an? )?(?:MRI|CT scan|X-ray|ultrasound))\b/i,
      ],
      [
        "currentSymptoms",
        /\b(?:my other symptoms (?:are|include)|my current symptoms (?:are|include))\b/i,
      ],
      [
        "ros",
        /\b(?:my review of systems (?:is|includes)|my other health changes (?:are|include))\b/i,
      ],
      [
        "tobacco",
        /\b(?:I (?:smoke|vape|quit smoking|stopped smoking|do not smoke|don't smoke|have never smoked)|my tobacco use is|my nicotine use is)\b/i,
      ],
      [
        "alcohol",
        /\b(?:my alcohol use is|I drink alcohol|I (?:do not|don't) drink alcohol)\b/i,
      ],
      [
        "substances",
        /\b(?:my substance use is|I use cannabis|I use marijuana)\b/i,
      ],
      [
        "occupation",
        /\b(?:I work as|my occupation is|my job is|I am retired|I'm retired)\b/i,
      ],
      [
        "exercise",
        /\b(?:my exercise (?:is|includes)|I exercise|my usual activity is)\b/i,
      ],
      ["sleep", /\b(?:I sleep|my sleep is|I have trouble sleeping)\b/i],
      [
        "nutrition",
        /\b(?:my diet is|my appetite is|my dietary restrictions (?:are|include))\b/i,
      ],
      [
        "functionalLimitations",
        /\b(?:my daily limitations (?:are|include)|my functional limitations (?:are|include)|I have difficulty (?:walking|dressing|driving|working))\b/i,
      ],
      [
        "pcp",
        /\b(?:my primary care (?:provider|doctor|physician) is|my PCP is|I (?:do not|don't) have a primary care (?:provider|doctor))\b/i,
      ],
      [
        "specialists",
        /\b(?:my specialist is|my specialists (?:are|include)|I see a specialist|I am seeing a specialist)\b/i,
      ],
      [
        "referral",
        /\b(?:I was referred by|my referral (?:is|came from)|I heard about you (?:from|through))\b/i,
      ],
      [
        "additionalConcerns",
        /\b(?:my additional concerns (?:are|include)|I also want to discuss|my question for the provider is)\b/i,
      ],
    ];
    for (const [id, pattern] of narrativePatterns)
      if (pattern.test(c)) put(id, c);
    put("address", c.match(/\b(?:my address is|I live at)\s+(.+)/i)?.[1]);
    put(
      "insurance",
      c.match(
        /\b(?:my insurance is|my insurance company is|I am insured by|I have insurance with)\s+(.+)/i,
      )?.[1],
    );
    put(
      "memberId",
      c.match(/\b(?:my member id is|member number is)\s+(.+)/i)?.[1],
    );
    put(
      "medications",
      c.match(
        /\b(?:I take|I am taking|my medications are|my medication is)\s+(.+)/i,
      )?.[1],
    );
    if (
      /\b(?:no medications|do not take (?:any )?medications|don't take (?:any )?medications)\b/i.test(
        c,
      )
    )
      put("medications", "None reported");
    if (/\b(?:no (?:known )?allergies|not allergic to anything)\b/i.test(c))
      put("allergies", "None reported");
    else
      put(
        "allergies",
        c.match(
          /\b(?:I am allergic to|I'm allergic to|my allergies are|^allergic to)\s+(.+)/i,
        )?.[1],
      );
    put(
      "history",
      c.match(
        /\b(?:my medical history is|my history includes|I have a history of)\s+(.+)/i,
      )?.[1],
    );
    put(
      "reason",
      c.match(
        /\b(?:I'm here for|I am here for|my reason for visiting is|I'm here because|I am here because)\s+(.+)/i,
      )?.[1],
    );
    if (
      /\b(?:my|the)\s+(?:(?:left|right|both)\s+)?(?:knee|back|neck|shoulder|hip|ankle|wrist|head|leg|arm|foot|feet|hand)s?\s+(?:hurts?|is sore|is painful)\b/i.test(
        c,
      )
    )
      put("reason", c);
    put(
      "onset",
      c.match(
        /\b(?:it started|pain started|started on|began on|since)\s+(.+)/i,
      )?.[1],
    );
    put(
      "aggravating",
      c.match(
        /\b(.+?)\s+(?:makes? (?:it|the pain) worse|makes? (?:it|the pain) hurt)/i,
      )?.[1] || c.match(/\b(?:worse (?:with|when)|aggravated by)\s+(.+)/i)?.[1],
    );
    put(
      "relieving",
      c.match(/\b(.+?)\s+(?:helps|makes? (?:it|the pain) better)/i)?.[1] ||
        c.match(/\b(?:better with|relieved by)\s+(.+)/i)?.[1],
    );
    put(
      "goals",
      c.match(
        /\b(?:my goal is|I want to|I'd like to|I would like to)\s+(.+)/i,
      )?.[1],
    );
  }
  const patientText = clauses
    .filter(
      (c) =>
        !/\b(?:my\s+(?:mother|father|mom|dad|parents|sister|brother|sibling|son|daughter|child|children|grandmother|grandfather|grandparent|aunt|uncle)|family (?:medical )?history)\b/i.test(
          c,
        ),
    )
    .join(". ");
  const anatomy = patientText.match(
    /\b(?:(left|right|both)\s+)?(lower back|upper back|back|neck|knees?|shoulders?|hips?|ankles?|wrists?|elbows?|head|legs?|arms?|feet|foot|hands?)\b/i,
  );
  // Only map anatomy when the statement explicitly concerns pain/symptoms, never from incidental mentions.
  if (
    anatomy &&
    /\b(?:hurts?|pain|aching|sore|discomfort)\b/i.test(patientText)
  ) {
    put("location", anatomy[2]);
    put("side", anatomy[1]);
  }
  const severity =
    patientText.match(
      /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|10|[0-9])\s*(?:out of (?:ten|10)|\/\s*10)/i,
    ) ||
    patientText.match(
      /\b(?:pain(?: level)?(?: is| at)?|severity(?: is)?)\s+(zero|one|two|three|four|five|six|seven|eight|nine|ten|10|[0-9])\b/i,
    );
  if (severity)
    put("severity", numberWords[severity[1].toLowerCase()] || severity[1]);
  const quality = patientText.match(
    /\b(sharp|dull|burning|throbbing|aching|stabbing|shooting|tingling)\b/i,
  );
  put("quality", quality?.[1]);
  const merged = new Map<FieldId, Candidate>();
  for (const candidate of out) {
    const previous = merged.get(candidate.id);
    if (
      previous &&
      healthFields.some((f) => f.id === candidate.id) &&
      previous.value !== candidate.value
    )
      merged.set(candidate.id, {
        ...candidate,
        value: `${previous.value}; ${candidate.value}`,
      });
    else merged.set(candidate.id, candidate);
  }
  // Context is used only for an explicitly selected question with no other recognized answer.
  if (
    context &&
    merged.size === 0 &&
    fields.some((f) => f.id === context) &&
    clean(text)
  )
    merged.set(context, { id: context, value: clean(text), source: text });
  return Array.from(merged.values());
}
export function propose(current: RecordData, candidates: Candidate[]) {
  const updates: Candidate[] = [];
  const conflicts: Candidate[] = [];
  for (const c of candidates) {
    const old = current[c.id];
    if (!old || !old.value) updates.push(c);
    else if (old.value.toLowerCase() !== c.value.toLowerCase())
      conflicts.push(c);
  }
  return { updates, conflicts };
}
export const SAMPLE =
  "My name is Maria Lopez. My left knee hurts. It started Monday. The pain is seven out of ten and feels sharp. Walking makes it worse. Rest helps. I take acetaminophen, and I am allergic to penicillin. I want to get back to walking comfortably.";
