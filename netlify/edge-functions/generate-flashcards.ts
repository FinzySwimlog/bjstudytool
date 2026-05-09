async function authorized(authHeader: string): Promise<boolean> {
  const token = authHeader.replace('Bearer ', '');
  const [timestamp, sig] = token.split('.');
  if (!timestamp || !sig) return false;
  if (Date.now() - parseInt(timestamp, 10) > 30 * 24 * 60 * 60 * 1000) return false;

  const secret = Deno.env.get('APP_SECRET') ?? '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(timestamp));
  const expected = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  return sig === expected;
}

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

export default async function (req: Request): Promise<Response> {
  const headers = { 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  if (!await authorized(req.headers.get('authorization') ?? '')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  try {
    const { content } = await req.json();

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `Generate flashcards from the following study content. Return ONLY a valid JSON array of objects with "term" and "definition" fields. No explanation, just the JSON array.

Terms should be concise (a word or short phrase). Definitions can use markdown for clarity — use **bold** for key sub-terms or labels, and numbered or bullet lists when a concept has distinct steps or points. Keep definitions focused and not too long.

Content:\n${content}`,
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Anthropic error: ${err}` }), { status: 502, headers });
    }

    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? '';
    const cards = JSON.parse(extractJSON(text)).map((c: { term: string; definition: string }) => ({
      id: crypto.randomUUID(),
      term: c.term,
      definition: c.definition,
      tricky: false,
    }));

    return new Response(JSON.stringify(cards), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
  }
}
