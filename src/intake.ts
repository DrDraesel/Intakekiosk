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
  | "insurance"
  | "memberId";
export type Group = "identity" | "story" | "health";
export type Field = {
  id: FieldId;
  label: string;
  group: Group;
  placeholder: string;
  required?: boolean;
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
  {
    id: "medications",
    label: "Current medications",
    group: "health",
    placeholder: "Names, doses if known, or none",
    required: true,
  },
  {
    id: "allergies",
    label: "Allergies",
    group: "health",
    placeholder: "Allergies and reactions, or none",
    required: true,
  },
  {
    id: "history",
    label: "Medical history",
    group: "health",
    placeholder: "Anything your care team should know",
  },
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
export function extract(text: string): Candidate[] {
  const out: Candidate[] = [];
  const put = (id: FieldId, value: string | undefined) => {
    if (value && clean(value))
      out.push({ id, value: clean(value), source: text });
  };
  const clauses = text
    .split(
      /[,;.!?]|\b(?:and|but)\b(?=\s+(?:my|I|the|it|walking|rest|I’m|I'm|I'm))/i,
    )
    .map(clean)
    .filter(Boolean);
  const name = text.match(
    /\bmy name is\s+([\p{L}'’-]+(?:\s+[\p{L}'’-]+){0,3}?)(?=\s+(?:and|my|I|i'm)\b|[,;.!?]|$)/iu,
  );
  put("name", name?.[1]);
  const born = text.match(
    /\b(?:date of birth is|birthday is|born on|born)\s+([^;.!?]+?)(?=\s+and\b|,\s*(?:my|I)\b|$)/i,
  );
  put("dob", born?.[1]);
  const email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  put("email", email?.[0]);
  const phone = text.match(
    /(?:phone(?: number)?(?: is)?|call me at)\s*([+\d()\s-]{7,22})/i,
  );
  put("phone", phone?.[1]);
  for (const c of clauses) {
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
  const anatomy = text.match(
    /\b(?:(left|right|both)\s+)?(lower back|upper back|back|neck|knees?|shoulders?|hips?|ankles?|wrists?|elbows?|head|legs?|arms?|feet|foot|hands?)\b/i,
  );
  // Only map anatomy when the statement explicitly concerns pain/symptoms, never from incidental mentions.
  if (anatomy && /\b(?:hurts?|pain|aching|sore|discomfort)\b/i.test(text)) {
    put("location", anatomy[2]);
    put("side", anatomy[1]);
  }
  const severity =
    text.match(
      /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|10|[0-9])\s*(?:out of (?:ten|10)|\/\s*10)/i,
    ) ||
    text.match(
      /\b(?:pain(?: level)?(?: is| at)?|severity(?: is)?)\s+(zero|one|two|three|four|five|six|seven|eight|nine|ten|10|[0-9])\b/i,
    );
  if (severity)
    put("severity", numberWords[severity[1].toLowerCase()] || severity[1]);
  const quality = text.match(
    /\b(sharp|dull|burning|throbbing|aching|stabbing|shooting|tingling)\b/i,
  );
  put("quality", quality?.[1]);
  return Array.from(new Map(out.map((c) => [c.id, c])).values());
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
