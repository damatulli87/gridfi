// Daily cron endpoint — keeps Supabase project active so it doesn't auto-pause.
export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ ok: false, error: 'Missing Supabase env vars' });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/cycles?select=id&limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    return res.status(200).json({ ok: true, supabaseStatus: response.status, ts: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
