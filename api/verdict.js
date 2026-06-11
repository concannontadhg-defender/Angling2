'use strict';
/**
 * Server-side proxy for Anthropic API.
 * API key stored in ANTHROPIC_API_KEY environment variable on Vercel.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment variables' });

  // Parse body – Vercel passes it as req.body when Content-Type is application/json
  let prompt;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    prompt = body.prompt;
    if (!prompt || typeof prompt !== 'string') throw new Error('missing prompt');
  } catch (e) {
    return res.status(400).json({ error: 'Request body must be JSON: { "prompt": "..." }' });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 450,
        messages:   [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error('[VERDICT] Anthropic:', r.status, txt.slice(0,200));
      return res.status(502).json({ error: `Anthropic API returned ${r.status}` });
    }

    const data = await r.json();
    const text = data?.content?.[0]?.text || '';
    if (!text) return res.status(502).json({ error: 'Empty response from Claude' });
    return res.json({ text });

  } catch (e) {
    console.error('[VERDICT] error:', e.message);
    return res.status(502).json({ error: e.message });
  }
};
