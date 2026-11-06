/**
 * "Submit to Mission Control" step for the intake kiosk.
 *
 * The kiosk keeps nothing by design; when a patient completes a check-in the
 * structured record is POSTed to the practice's local Mission Control hub
 * (default http://127.0.0.1:8790/api/intake — LabFlow — override with VITE_MC_URL).
 * The call never throws and never blocks the patient flow - a failed delivery
 * is reported in the console, and the answers stay in this browser tab.
 */
import type { FieldId, RecordData } from "./intake.ts";

export type MissionControlOutcome = {
  ok: boolean;
  status?: number;
  error?: string;
};

export type IntakeSubmission = {
  id: string;
  submittedAt: string;
  locale: string;
  category: string;
  attention: boolean;
  patient: {
    name: string;
    dob: string;
    phone: string;
    email: string;
    address: string;
    insurance: string;
    memberId: string;
  };
  fields: Record<
    string,
    { value: string; confirmed: boolean; source: string; timestamp: string }
  >;
  transcript: {
    original: string;
    timestamp: string;
    source: string;
    questionId: FieldId | null;
  }[];
};

const DEFAULT_ENDPOINT = "http://127.0.0.1:8790/api/intake";

export function missionControlEndpoint(): string {
  const meta = import.meta as unknown as {
    env?: Record<string, string | undefined>;
  };
  return meta.env?.VITE_MC_URL ?? DEFAULT_ENDPOINT;
}

export function buildSubmission(args: {
  id: string;
  locale: string;
  category: string;
  attention: boolean;
  data: RecordData;
  segments: {
    original: string;
    timestamp: string;
    source: string;
    questionId?: FieldId | null;
  }[];
}): IntakeSubmission {
  const fields: IntakeSubmission["fields"] = {};
  for (const [key, entry] of Object.entries(args.data)) {
    if (entry?.value)
      fields[key] = {
        value: entry.value,
        confirmed: !!entry.confirmed,
        source: entry.source,
        timestamp: entry.timestamp,
      };
  }
  const pick = (id: FieldId) => args.data[id]?.value ?? "";
  return {
    id: args.id,
    submittedAt: new Date().toISOString(),
    locale: args.locale,
    category: args.category,
    attention: args.attention,
    patient: {
      name: pick("name"),
      dob: pick("dob"),
      phone: pick("phone"),
      email: pick("email"),
      address: pick("address"),
      insurance: pick("insurance"),
      memberId: pick("memberId"),
    },
    fields,
    transcript: args.segments.map((segment) => ({
      original: segment.original,
      timestamp: segment.timestamp,
      source: segment.source,
      questionId: segment.questionId ?? null,
    })),
  };
}

export async function submitIntake(
  submission: IntakeSubmission,
  options?: {
    endpoint?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<MissionControlOutcome> {
  const endpoint = options?.endpoint ?? missionControlEndpoint();
  const doFetch = options?.fetchImpl ?? fetch;
  try {
    const response = await doFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 8000),
      redirect: "error",
      cache: "no-store",
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
