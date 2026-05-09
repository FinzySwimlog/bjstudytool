import Anthropic from '@anthropic-ai/sdk';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Handler } from '@netlify/functions';

function authorized(event: Parameters<Handler>[0]): boolean {
  const token = (event.headers['authorization'] ?? '').replace('Bearer ', '');
  const [timestamp, sig] = token.split('.');
  if (!timestamp || !sig) return false;
  if (Date.now() - parseInt(timestamp, 10) > 30 * 24 * 60 * 60 * 1000) return false;
  const expected = createHmac('sha256', process.env.APP_SECRET!).update(timestamp).digest('hex');
  try { return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch { return false; }
}

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

export const handler: Handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };
  if (!authorized(event)) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const { content } = JSON.parse(event.body!);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Generate flashcards from the following study content. Return ONLY a valid JSON array of objects with "term" and "definition" fields. No explanation, just the JSON array.

Terms should be concise (a word or short phrase). Definitions can use markdown for clarity — use **bold** for key sub-terms or labels, and numbered or bullet lists when a concept has distinct steps or points. Keep definitions focused and not too long.

Content:\n${content}`,
    }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  const cards = JSON.parse(extractJSON(text)).map((c: { term: string; definition: string }) => ({
    id: crypto.randomUUID(),
    term: c.term,
    definition: c.definition,
    tricky: false,
  }));

  return { statusCode: 200, headers, body: JSON.stringify(cards) };
};
