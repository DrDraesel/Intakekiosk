# Supabase connection foundation

This connects the deployment to a Supabase setup marker only. Patient submissions remain disabled. The staff screen is a public demonstration, not an authenticated provider portal.

1. Select the clinic-owned Supabase project. Confirm its organization, region, and environment before applying changes.
2. Run `migrations/202610070001_connection_foundation.sql` once in that project's SQL editor or through the Supabase migration CLI. It adds new objects only, inside a transaction. A duplicate name causes the transaction to fail rather than overwrite existing objects.
3. In the linked Vercel project `imw2/imw-patient-kiosk`, add these server environment variables for the intended environment:
   - `SUPABASE_URL`: the project HTTPS URL.
   - `SUPABASE_PUBLISHABLE_KEY`: the project's `sb_publishable_...` key.
4. Redeploy. `GET /api/storage-status` should return `state: connected` and `patientStorageEnabled: false`. It verifies the migration marker, not clinical readiness. The endpoint returns no credentials, identifiers, or records.

The check uses a publishable key with read access to a non-sensitive marker. It requires no database password or privileged secret key. Never place a secret key in a Vite variable, source control, browser code, or chat. Keep `imw_private` out of exposed Data API schemas.

Before enabling patient storage: verify the required Supabase/Vercel agreements and configuration; add individual staff authentication with MFA and clinic-scoped access; implement short-lived kiosk authorization, validated/idempotent submissions, access auditing, recovery/retention, private upload policies, and a suitable transcription provider. Test that unauthenticated users and staff from other clinics cannot access records. The private table deliberately has no usable patient API yet.

Local `vite` alone does not run Vercel API routes. Use Vercel development tooling for a full local connection test; `npm test` tests the server check with mocked responses.
