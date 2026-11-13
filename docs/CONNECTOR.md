# Confirmed intake delivery

The public kiosk is a demonstration until a clinic configures the destination and enables live intake. Existing Supabase connectivity does not enable patient storage or EHR delivery. No real EHR is connected in this repository by default.

## Server-only configuration

Configure these environment variables in Vercel for the intended deployment. Never put them in `VITE_*` variables, commit them, or paste them into chat:

- `INTAKE_LIVE_ENABLED=true` — enable only after the clinic approves privacy, hosting, speech-provider processing, retention, access controls, and applicable agreements.
- `INTAKE_PUBLIC_ORIGIN=https://your-kiosk-domain` — exact HTTPS origin, no trailing slash.
- `EHR_CONNECTOR_URL=https://your-approved-host/intakes` — fixed HTTPS intake endpoint, no query string, credentials, or redirects.
- `EHR_CONNECTOR_HOST=your-approved-host` — exact independent hostname allowlist.
- `EHR_CONNECTOR_NAME=EHR Mission Control` — patient-visible destination name.
- `EHR_CONNECTOR_TOKEN` — scoped credential for the approved destination.
- `INTAKE_SESSION_SECRET` — random secret with at least 32 characters, issued and held in clinic-controlled server configuration.

This is a documented webhook adapter, not a claim of compatibility with an undocumented EHR Mission Control API. Map and validate the receiving system's contract before enabling it.

The newer repository contained a legacy `src/missionControl.ts` browser adapter defaulting to a local LabFlow hub at `http://127.0.0.1:8790/api/intake`. That code and its tests are preserved. No listener was reachable at that port during this update. The redesigned public kiosk uses the authenticated same-origin delivery route instead of silently posting to an arbitrary patient's loopback interface. To retain the legacy LabFlow `patient` / `fields` / `id` payload format through an approved HTTPS gateway, set `EHR_CONNECTOR_FORMAT=labflow`. The adapter adds both summaries and sharing confirmation, omits the raw transcript/audio, and still requires an actual acceptance receipt. Validate the real hub/gateway contract before enabling this option.

## Clinic invitations

Run `node scripts/create-intake-invite.mjs` in a trusted clinic environment with the session secret and public origin configured. The output is a one-hour signed invitation URL. Treat it as a sensitive access credential and share it only with its intended patient using an approved channel. Do not log it, publish it, or reuse it across patients.

The URL fragment is consumed into memory and removed from the address bar. It contains a random session ID and expiration, not patient data. The browser sends the token only in the same-origin submission Authorization header. Invalid, expired, unsigned, or missing invitations cannot submit. Invitations are not a replacement for staff authentication, person verification, or an EHR's access policies. The receiving connector must bind the invitation's session ID to the intended encounter and enforce authorization, expiration, and abuse limits.

## Endpoint contract

`GET /api/intake-config` returns only enabled state and a display name. It never returns credentials or URLs.

`POST /api/intake-submit` requires same-origin JSON, a signed invitation, explicit review and sharing confirmation, required answers, resolved conflicts in the UI, and a stable submission UUID. No transcript or audio file is submitted. It rebuilds both summaries from the validated confirmed answers and rejects summaries that differ from the patient's reviewed snapshot. Every fact is labeled `patient_reported`; connected-record verification and diagnosis remain empty. `confirmed` means confirmed by the patient, not by a clinician.

The receiver receives:

```json
{
  "version": 1,
  "submissionId": "UUID",
  "sessionId": "invitation session UUID",
  "locale": "en",
  "answers": {
    "reason": {
      "value": "Patient's words",
      "source": "Original response",
      "confirmed": true,
      "provenance": "patient_reported"
    }
  },
  "summaries": { "patient": {}, "doctor": {} },
  "confirmation": {
    "reviewed": true,
    "share": true,
    "confirmedAt": "ISO date"
  },
  "immediateAttention": false
}
```

The real payload includes all confirmed answers and complete structured summaries. The receiving connector must return HTTP 2xx and JSON `{ "status": "accepted", "receiptId": "stable-receipt-id" }` only after durable acceptance. Empty responses, redirects, errors, invalid receipts, and timeouts are never shown as delivery success. Receipts are restricted to simple IDs to avoid reflecting arbitrary upstream content.

Retries reuse the same session-scoped `Idempotency-Key`. The receiving connector **must durably deduplicate that key** and return the original receipt; the stateless Vercel function does not provide a durable outbox or deduplication database. After an uncertain network response, do not manually create a second intake. Editing answers or changing the locale creates a new submission snapshot and requires renewed review/consent.

## Privacy and resume behavior

Answers and original transcripts are held in React memory only; no localStorage, sessionStorage, analytics, or database patient writes are used. The app clears its active intake after ten minutes without pointer/keyboard activity. Browser speech recognition is separately disclosed and may process audio with the browser vendor; the app does not store audio. Clinicians must approve that speech provider before real use.

Patients can optionally download an AES-256-GCM encrypted draft protected with a 12+ character passphrase, derived with PBKDF2-SHA256 (310,000 iterations, random salt and IV). Neither the passphrase nor draft is uploaded. Restoring requires the passphrase and reopens all answers for review, without restoring microphone or sharing consent. Losing the file or passphrase cannot be recovered by the clinic. Invite credentials are never exported in draft files.

No real-patient storage, EHR connection, connected-record verification, identity matching, regulatory certification, or live microphone hardware validation is implied by this implementation. End-to-end live delivery requires the actual connector contract, credentials, receiving-system deduplication, and a clinic-approved deployment configuration.
