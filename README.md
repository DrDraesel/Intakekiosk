# IMW Patient Kiosk — voice intake visual prototype

A responsive React + TypeScript prototype for Innovative Medical Wellness. This is a synthetic-data demonstration, not the completed clinical MVP described in the supplied specification.

## Run

```powershell
npm install
npm run dev
```

Open the URL printed by Vite. To validate and build:

```powershell
npm test
npm run build
```

## Try the experience

1. Press **Try a sample**. A fictional narrative fills 12 fields across identity, visit history, medications, and allergies.
2. Type “The pain is three out of ten.” The prior value stays until you confirm the proposed change.
3. Select any filled field to edit or confirm it.
4. Choose **Review & finish**, supply a sample birth date and fictional phone number, answer the safety question, and check both acknowledgments.
5. Complete the demo check-in. **Staff view** shows an encounter identifier with READY or ATTENTION status.
6. **New session** clears patient fields and transcripts. Completed anonymous encounter entries remain in the tab's demonstration queue.

## Voice

**Start speaking** presents the transcription notice before requesting microphone access. The browser's SpeechRecognition implementation provides interim and final transcripts where supported. Each voice section ends after a pause; the patient can start another section, pause, or stop. Microphone state and acknowledgments remain visible. Spoken feedback plays after listening ends so it is not recorded as a patient answer.

The speech provider interface is in `src/voice.ts`. Unsupported browsers and permission errors keep text entry available. Actual microphone hardware and iPad Safari still require device testing; automated checks exercised the identical extraction path with typed and sample transcripts.

## Extraction boundary

`src/intake.ts` uses a deterministic English phrase extractor. It supports selected phrases such as “My name is…”, “I take…”, “I am allergic to…”, “It started…”, and “seven out of ten”. It maps across sections regardless of the displayed question. It is **not** a general language-model extractor and cannot understand every phrasing or clinical context. Unmatched statements remain in the original transcript and can be entered manually. Conflicting values require explicit confirmation.

Original transcript sections, extraction sources, field review states, and timestamps are held only in memory. Refresh clears the intake. The session clears after ten minutes without pointer or keyboard activity and sixty seconds after completion. The app does not record or retain raw audio. A browser speech provider may transmit audio to its own service; the voice notice explains this.

## Included

- Responsive desktop, tablet, and phone layouts; large-text control and reduced-motion support.
- Voice/text intake with visible microphone states and optional spoken acknowledgments.
- Editable identity, contact, insurance, HPI, medications, allergies, and history fields.
- Optional consent-gated photo selection or camera capture; in-memory preview.
- Patient review, preliminary structured summary, test acknowledgment, and simulated check-in.
- Explicit immediate-attention answer and an ATTENTION demonstration queue state.
- Seven extraction tests covering multi-field narrative, conflicts, unknown content, negatives, and preserved source strings.

## Not connected yet

No clinic database, Google Sheets/Drive/Gmail, OCR, provider sign-in, clinical questionnaire registry, approved consent signatures, general AI extraction, staff notifications, durable recovery, or P620 event delivery is implemented. The staff screen is intentionally public demonstration UI and does not show real patient records. Do not use real patient data.

## Vercel

Live synthetic demo: https://imw-patient-kiosk.vercel.app

Source repository: https://github.com/DrDraesel/Intakekiosk

The Vercel project `imw2/imw-patient-kiosk` is connected to this repository. Pushes to `main` deploy the demo, and pull requests create previews. GitHub Actions runs the extraction tests and production build. Deployment access follows the Vercel project's protection settings.

Clone the source with:

```powershell
git clone git@github.com:DrDraesel/Intakekiosk.git
```

The source root includes `vercel.json` for a Vite deployment. For an account-backed preview, sign in and deploy:

```powershell
npx vercel login
npx vercel deploy
```

A temporary preview can be deployed from the built static directory without signing in:

```powershell
npm run build
npx vercel deploy dist --temporary --yes
```

Vercel's anonymous temporary previews expire after one hour unless claimed through the private claim link returned by the CLI. Keep the claim link out of source control and publicly hosted files.

## Next engineering step

Replace the bounded extractor with a protected server-side structured extraction adapter using the canonical field IDs, source evidence, unknown values, conflict checks, and patient verification already represented here. Choose and validate a production speech provider on the target iPad, then connect approved persistence, OCR, consents, and notifications behind their own interfaces.
