async function authorized(authHeader: string): Promise<boolean> {
  const token = authHeader.replace('Bearer ', '');
  const [timestamp, sig] = token.split('.');
  if (!timestamp || !sig) return false;
  if (Date.now() - parseInt(timestamp, 10) > 30 * 24 * 60 * 60 * 1000) return false;
  const secret = Deno.env.get('APP_SECRET') ?? '';
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(timestamp));
  const expected = Array.from(new Uint8Array(sigBytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return sig === expected;
}

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

export default async function (req: Request): Promise<Response> {
  const jsonHeaders = { 'Content-Type': 'application/json' };
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!await authorized(req.headers.get('authorization') ?? '')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
  }

  const { cards, history, userMessage } = await req.json();

  const systemPrompt = `You are an AI assistant helping a student edit their flashcard set. Follow the user's instructions to modify, add, remove, or reorganise cards.

Current flashcard set (${cards.length} cards):
${JSON.stringify(cards)}

Rules:
- Return a JSON object with exactly two fields: "message" (1-2 sentence friendly summary of what you did) and "cards" (the complete updated array)
- Each card must have: id (string), term (string), definition (string), tricky (boolean)
- Keep existing IDs for unchanged/modified cards. Use "" for brand new cards.
- Definitions can use markdown: **bold** for key terms, bullet/numbered lists for steps
- Always return the full cards array even if nothing changed
- Return ONLY valid JSON, no other text`;

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
      system: systemPrompt,
      stream: true,
      messages: [
        ...history.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ],
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
                controller.enqueue(encoder.encode('\n'));
              }
            } catch { /* ignore malformed SSE lines */ }
          }
        }
        const parsed = JSON.parse(extractJSON(fullText));
        const updatedCards = parsed.cards.map((c: { id: string; term: string; definition: string; tricky: boolean }) => ({
          ...c,
          id: c.id || crypto.randomUUID(),
        }));
        controller.enqueue(encoder.encode('RESULT:' + JSON.stringify({ message: parsed.message, cards: updatedCards }) + '\n'));
      } catch (e) {
        controller.enqueue(encoder.encode('ERROR:' + String(e) + '\n'));
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/plain' } });
}
