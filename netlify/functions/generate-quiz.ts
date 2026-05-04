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

  const { cards } = JSON.parse(event.body!);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const cardList = cards.map((c: { term: string; definition: string }) => `Term: ${c.term}\nDefinition: ${c.definition}`).join('\n\n');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Create a multiple-choice quiz from these flashcards. Return ONLY a valid JSON array. Each object must have: "question" (string), "correct" (string, the correct answer), "options" (array of 4 strings including the correct one, shuffled). No markdown, no explanation, just the JSON array.\n\nFlashcards:\n${cardList}`,
    }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  return { statusCode: 200, headers, body: JSON.stringify(JSON.parse(extractJSON(text))) };
};
