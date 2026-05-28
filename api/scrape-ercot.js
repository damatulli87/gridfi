// Vercel serverless function — fetches and parses live ERCOT NP6788 LMP data.
// Deployed at: /api/scrape-ercot (GET)
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://gridfi-pearl.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Cache-Control', 'no-store');

  const url = 'https://www.ercot.com/content/cdr/html/current_np6788.html';
  let html;
  let retries = 3;

  while (retries > 0) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      html = await response.text();
      break;
    } catch (e) {
      retries--;
      if (retries === 0) {
        return res.status(502).json({
          error: 'Failed to fetch ERCOT data after 3 attempts',
          details: e.message,
        });
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Parse last-updated timestamp
  const timeMatch = html.match(/Last Updated:\s*(?:&nbsp;)?\s*([^<]+)/);
  const lastUpdated = timeMatch ? timeMatch[1].replace(/&nbsp;/g, ' ').trim() : null;

  // Parse settlement point rows
  const nodes = [];
  const rowRegex =
    /<tr>\s*<td class="tdLeft">([^<]+)<\/td>\s*<td class="tdLeft">\s*([^<]+)<\/td>\s*<td class="tdLeft[^"]*">\s*([^<]+)<\/td>\s*<td class="tdLeft">\s*([^<]+)<\/td>\s*<td class="tdLeft[^"]*">\s*([^<]+)<\/td>\s*<\/tr>/g;

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const name = match[1].trim();
    const lmp = parseFloat(match[2].trim());
    const change5min = parseFloat(match[3].trim());

    if (!isNaN(lmp)) {
      let nodeType = 'Resource Node';
      if (name.endsWith('_ALL')) nodeType = 'Load Zone';
      else if (name.startsWith('LZ_')) nodeType = 'Load Zone';
      else if (name.startsWith('HB_')) nodeType = 'Hub';

      nodes.push({ name, lmp, change5min, nodeType });
    }
  }

  return res.status(200).json({
    lastUpdated,
    nodeCount: nodes.length,
    nodes,
    fetchedAt: new Date().toISOString(),
  });
}
