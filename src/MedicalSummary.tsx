import { useState } from "react";
import { fields, type RecordData } from "./intake";
import { translate, type Locale } from "./i18n";
import {
  buildMedicalSummary,
  clinicServices,
  canDiscussServices,
} from "./clinicalReport";

export function MedicalSummary({
  data,
  locale,
  safety,
  conflictCount,
  clinician = false,
}: {
  data: RecordData;
  locale: Locale;
  safety: boolean | null;
  conflictCount: number;
  clinician?: boolean;
}) {
  const t = (text: string) => translate(text, locale);
  const summary = buildMedicalSummary(data);
  const [reviewed, setReviewed] = useState(false);
  const [interested, setInterested] = useState(false);
  const [service, setService] = useState("");
  const [reason, setReason] = useState("");
  const eligible = canDiscussServices(
    reviewed,
    interested,
    safety,
    conflictCount,
    reason,
  );
  return (
    <section className="medical-summary">
      <span className="eyebrow">{t("MEDICAL SUMMARY · PATIENT-REPORTED")}</span>
      <h2>{t("Clinical and functional overview")}</h2>
      <p>
        {t(
          "Draft for clinician review. Patient reports are preserved; causes, diagnoses, and treatment eligibility have not been established.",
        )}
      </p>
      <div className="medical-reason">
        <strong>{t("Reported reason for visit")}</strong>
        <p translate="no">
          {summary.reason ||
            t("Not provided — ask the patient to clarify the main concern.")}
        </p>
      </div>
      {safety !== false && (
        <p className="safety-alert" role="status">
          {t(
            safety
              ? "Patient requested immediate staff attention. Address this before routine service discussions."
              : "Immediate-attention question is unanswered. Confirm with the patient.",
          )}
        </p>
      )}
      {conflictCount > 0 && (
        <p className="safety-alert">
          {t(
            "Conflicting answers remain. Resolve them before clinical assessment.",
          )}
        </p>
      )}
      {summary.sections.map((section) => (
        <section className="medical-section" key={section.title}>
          <h3>{t(section.title)}</h3>
          <dl>
            {section.entries.map((entry) => (
              <div key={entry.id}>
                <dt>
                  {t(entry.label)} ·{" "}
                  {t(entry.confirmed ? "Reviewed" : "Unreviewed")}
                </dt>
                <dd translate="no">{entry.value}</dd>
                <details>
                  <summary>{t("Source evidence")}</summary>
                  <p translate="no">{entry.source}</p>
                </details>
              </div>
            ))}
          </dl>
          {section.missing.length > 0 && (
            <p className="footnote">
              {t("Not provided")}:{" "}
              {section.missing
                .map((id) => t(fields.find((f) => f.id === id)!.label))
                .join(", ")}
            </p>
          )}
        </section>
      ))}
      <p className="footnote">
        {t(
          "Missing answers are unknown, not negative findings. Exam, vital signs, laboratory results, assessment, and plan require clinician input.",
        )}
      </p>
      {clinician && (
        <section className="service-discussion">
          <h3>{t("Clinician assessment and optional service discussion")}</h3>
          <label htmlFor="clinician-reason">
            {t("Clinician working reason for visit")}
          </label>
          <textarea
            id="clinician-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReviewed(false);
            }}
            placeholder={t(
              "Enter after reviewing the patient history and clinical findings.",
            )}
          />
          <label className="summary-check">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            {t(
              "Clinician has reviewed clinical appropriateness and contraindications.",
            )}
          </label>
          <label className="summary-check">
            <input
              type="checkbox"
              checked={interested}
              onChange={(e) => setInterested(e.target.checked)}
            />
            {t("Patient wants to discuss additional services.")}
          </label>
          <label htmlFor="service-discussion">
            {t("Website service catalog")}
          </label>
          <select
            id="service-discussion"
            value={service}
            disabled={!eligible}
            onChange={(e) => setService(e.target.value)}
          >
            <option value="">{t("Choose a service to discuss")}</option>
            {clinicServices.map((s) => (
              <option key={s.url} value={s.url}>
                {t(s.name)}
              </option>
            ))}
          </select>
          <p>
            {t(
              eligible
                ? "Optional discussion enabled. Confirm current availability, evidence, alternatives, and costs with the patient."
                : "Complete clinical review, clarify the visit reason, resolve conflicts, confirm no immediate help is needed, and record patient interest first.",
            )}
          </p>
          {service && eligible && (
            <a href={service} target="_blank" rel="noreferrer">
              {t("View clinic service information")}
            </a>
          )}
          <details>
            <summary>
              {t("Browse services listed on the clinic website")}
            </summary>
            <ul>
              {clinicServices.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {t(s.name)}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <p className="footnote">
            {t(
              "Website-listed services checked October 8, 2026. This draft stays in this demo view; no order, booking, offer, or message is sent.",
            )}
          </p>
        </section>
      )}
    </section>
  );
}
