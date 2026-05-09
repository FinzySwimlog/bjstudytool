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
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/s);
  if (fenceMatch) return fenceMatch[1].trim();
  const arrMatch = text.match(/\[[\s\S]*\]/s);
  if (arrMatch) return arrMatch[0].trim();
  return text.trim();
}

export default async function (req: Request): Promise<Response> {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
  }
  if (!await authorized(req.headers.get('authorization') ?? '')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
  }

  const { content } = await req.json();

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      stream: true,
      messages: [{
        role: 'user',
        content: `Generate flashcards from the following study content. Return ONLY a valid JSON array of objects with "term" and "definition" fields. No explanation, just the JSON array.

Terms should be concise (a word or short phrase). Definitions can use markdown for clarity — use **bold** for key sub-terms or labels, and numbered or bullet lists when a concept has distinct steps or points. Keep definitions focused and not too long.

Content:\n${content}`,
      }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text();
    return new Response(JSON.stringify({ error: err }), { status: 502, headers: jsonHeaders });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data || data === '[DONE]') continue;
            try {
              const event = JSON.parse(data);
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                fullText += event.delta.text;
                // Keepalive — prevents the edge function from being killed mid-stream
                controller.enqueue(encoder.encode('\n'));
              }
            } catch { /* ignore parse errors on individual SSE lines */ }
          }
        }

        const cards = JSON.parse(extractJSON(fullText)).map((c: { term: string; definition: string }) => ({
          id: crypto.randomUUID(),
          term: c.term,
          definition: c.definition,
          tricky: false,
        }));
        controller.enqueue(encoder.encode('RESULT:' + JSON.stringify(cards) + '\n'));
      } catch (e) {
        controller.enqueue(encoder.encode('ERROR:' + String(e) + '\n'));
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/plain' } });
}
