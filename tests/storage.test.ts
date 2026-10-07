import test from 'node:test';
import assert from 'node:assert/strict';
import { checkStorage } from '../api/storage-status.js';

const config = { SUPABASE_URL: 'https://fictional-project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };

test('unconfigured storage makes no outbound request', async () => {
  const result = await checkStorage({}, () => { throw new Error('must not call'); });
  assert.equal(result.state, 'not_configured');
  assert.equal(result.patientStorageEnabled, false);
});
test('connection check reads only the non-sensitive marker', async () => {
  const result = await checkStorage(config, async (url, options) => {
    assert.equal(url.pathname, '/rest/v1/imw_kiosk_connection');
    assert.equal(options.headers.apikey, config.SUPABASE_PUBLISHABLE_KEY);
    assert.equal(options.redirect, 'error');
    assert.equal(options.body, undefined);
    return { ok: true, json: async () => [{ schema_version: 1 }] };
  });
  assert.deepEqual(result, { state: 'connected', patientStorageEnabled: false });
  assert.equal(JSON.stringify(result).includes(config.SUPABASE_PUBLISHABLE_KEY), false);
});
test('unexpected destination and privileged key are rejected before network access', async () => {
  for (const values of [{...config, SUPABASE_URL: 'https://example.com'}, {...config, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_test'}]) {
    assert.equal((await checkStorage(values, () => { throw new Error('must not call'); })).state, 'configuration_error');
  }
});
test('missing migration and network failure cannot report connected', async () => {
  assert.equal((await checkStorage(config, async () => ({ ok: true, json: async () => [] }))).state, 'setup_required');
  assert.equal((await checkStorage(config, async () => { throw new Error('private upstream details'); })).state, 'unavailable');
});
