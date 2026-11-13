# IMW patient intake — orange glass design

A responsive React/TypeScript intake kiosk with a warm frosted-glass two-panel layout and orange accents. Built with Vite and deployed on Vercel. The public installation remains a fictional-data demonstration until the clinic configures and approves a receiving connector.

## Patient experience

- All 39 intake questions are accessible from a left-side section navigator. Status text and icons distinguish unanswered, captured but incomplete, patient-confirmed, and conflicting answers.
- A prominent right-side microphone interface supports explicit recording consent, visible recording state, pause/resume, live original-language transcript, typed answers, and corrections.
- Deterministic English, Spanish, and Russian phrase mapping can fill supported fields out of order. A selected question captures otherwise unmapped text verbatim. Unknown information is never fabricated, different answers are held for confirmation, and follow-ups request missing timeline, function, or clarification of uncertain statements.
- Separate patient and doctor summaries remain reviewable before submission. All facts are patient-reported. Patient confirmation is not clinician or connected-record verification. No diagnoses are generated.
- Required answers, conflict resolution, immediate-help response, patient review, and explicit sharing consent precede submission.
- Paused work remains in the current tab. Patients can download an encrypted draft for later use and restore it using their passphrase. No plain-text browser persistence is used. Inactive sessions clear after 10 minutes.

## Run and check

Use Node.js 24 or later.

```sh
npm ci
npm run dev
npm test
npm run build
```

Vite development serves the UI. Vercel serves the serverless API routes; on a plain Vite server the connector status defaults to unconfigured. Tests cover native-language mapping and evidence preservation, conflict handling, follow-ups, draft encryption and tampering, delivery authorization, consent, summary validation, receipt handling, and stable retry keys.

## EHR delivery

Read [docs/CONNECTOR.md](docs/CONNECTOR.md) for server-only settings, signed clinic invitations, and the receiving connector contract. The repository provides a configurable webhook adapter, not an undocumented proprietary EHR implementation. No EHR Mission Control destination or credential has been supplied. Delivery stays disabled and the UI explicitly says nothing was sent.

The server accepts only confirmed snapshots with matching patient and doctor summaries. It forwards to a fixed approved HTTPS endpoint with a scoped credential, checks for an actual acceptance receipt, and reuses an idempotency key on retries. The receiving connector must durably deduplicate retries and bind each invitation to its intended encounter. No success is shown merely because a button was clicked or a network request returned 2xx.

## Storage and sensitive information

The newer GitHub branch included a local Mission Control/LabFlow adapter defaulting to `http://127.0.0.1:8790/api/intake`. Its module and tests are preserved. No listener was reachable on that port during this update. Set `EHR_CONNECTOR_FORMAT=labflow` on the new server adapter to retain the existing identity/field contract through an approved HTTPS gateway, with both summaries and consent added. The redesigned public app does not silently post to a patient's loopback interface. See the connector guide for migration and receipt requirements.

The existing Supabase project `evyurqzpcfyjccoznhej` is linked only for a non-sensitive connection marker. `GET /api/storage-status` does not return patient data. The private intake schema remains inaccessible to public clients, and patient writes to Supabase remain disabled. The foundation migration is in `supabase/migrations/202610070001_connection_foundation.sql`.

Patient answers and transcripts remain in memory until separately confirmed delivery. The browser speech provider may process microphone audio; the app discloses this before recording and does not save audio. A saved resume file uses AES-256-GCM with PBKDF2-SHA256 and a patient-held passphrase. This implementation does not establish HIPAA compliance, verified patient identity, or a clinical record connection. Clinic-approved hosting, agreements, access controls, browser speech processing, receiving-system setup, and hardware testing are required before real-patient use.

## Design and languages

The user requested Glassworth Designs without a supplied theme reference. The implementation uses a warm frosted-glass interpretation with orange controls, neutral surfaces, accessible form labels, text status indicators, reduced-motion support, keyboard-trapped dialogs, and mobile navigation. It is not represented as an official licensed Glassworth template.

The interface, consent, summaries, and follow-ups support English, Spanish, and Russian. Voice recognition uses `en-US`, `es-US`, and `ru-RU`. Switching languages preserves patient wording and stops active recording. Existing patient answers are not machine-translated. Browser speech availability and recognition quality depend on the actual device/browser.
