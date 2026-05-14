import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = 'https://www.ercot.com/content/cdr/html/current_np6788.html';
    
    let html;
    let retries = 3;
    
    while (retries > 0) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        html = await response.text();
        break;
      } catch (e) {
        retries--;
        if (retries === 0) {
          return Response.json({ 
            error: 'Failed to fetch ERCOT data after 3 attempts', 
            details: e.message 
          }, { status: 502 });
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Parse timestamp
    const timeMatch = html.match(/Last Updated:\s*(?:&nbsp;)?\s*([^<]+)/);
    let lastUpdated = timeMatch ? timeMatch[1].replace(/&nbsp;/g, ' ').trim() : null;

    // Parse settlement point rows
    const nodes = [];
    // Match data rows: each row has Settlement Point, LMP, 5min change, RTRDPA+LMP, 5min change
    const rowRegex = /<tr>\s*<td class="tdLeft">([^<]+)<\/td>\s*<td class="tdLeft">\s*([^<]+)<\/td>\s*<td class="tdLeft[^"]*">\s*([^<]+)<\/td>\s*<td class="tdLeft">\s*([^<]+)<\/td>\s*<td class="tdLeft[^"]*">\s*([^<]+)<\/td>\s*<\/tr>/g;
    
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const name = match[1].trim();
      const lmp = parseFloat(match[2].trim());
      const change5min = parseFloat(match[3].trim());
      
      if (!isNaN(lmp)) {
        // Determine node type from naming convention
        let nodeType = 'Resource Node';
        if (name.endsWith('_ALL')) nodeType = 'Load Zone';
        else if (name.includes('_RN')) nodeType = 'Resource Node';
        else if (name.startsWith('LZ_')) nodeType = 'Load Zone';
        else if (name.startsWith('HB_')) nodeType = 'Hub';
        
        nodes.push({
          name,
          lmp,
          change5min,
          nodeType
        });
      }
    }

    return Response.json({
      lastUpdated,
      nodeCount: nodes.length,
      nodes,
      fetchedAt: new Date().toISOString()
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});