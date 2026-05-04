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

export const handler: Handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method not allowed' };
  if (!authorized(event)) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const { content } = JSON.parse(event.body!);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Create a concise, well-structured study summary of the following content. Use bullet points and clear headings. Focus on the most important concepts and definitions a student needs to remember.\n\nContent:\n${content}`,
    }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  return { statusCode: 200, headers, body: JSON.stringify({ text }) };
};
