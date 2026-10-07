export async function checkStorage(env, request = fetch) {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return { state: 'not_configured', patientStorageEnabled: false };
  try {
    const url = new URL(base);
    if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || url.username || url.password || url.port || url.pathname !== '/') {
      return { state: 'configuration_error', patientStorageEnabled: false };
    }
    if (!key.startsWith('sb_publishable_')) return { state: 'configuration_error', patientStorageEnabled: false };
    const response = await request(new URL('/rest/v1/imw_kiosk_connection?id=eq.1&select=schema_version&limit=1', url), {
      headers: { apikey: key, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
      cache: 'no-store',
    });
    if (!response.ok) return { state: 'setup_required', patientStorageEnabled: false };
    const rows = await response.json();
    return { state: Array.isArray(rows) && rows[0]?.schema_version === 1 ? 'connected' : 'setup_required', patientStorageEnabled: false };
  } catch {
    return { state: 'unavailable', patientStorageEnabled: false };
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  return res.status(200).json(await checkStorage(process.env));
}
