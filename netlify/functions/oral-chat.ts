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

  const { messages, topic, language } = JSON.parse(event.body!);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = language && language !== 'English'
    ? `You are a language tutor conducting an oral exam preparation session in ${language}. The topic is: "${topic}". Ask questions about the topic in ${language}, evaluate the student's ${language} responses for both content accuracy and language correctness. Give brief feedback in ${language} then English. Keep responses concise.`
    : `You are an exam preparation tutor. The topic is: "${topic}". Ask probing questions to test the student's understanding. After each answer, give brief targeted feedback — what was good, what was missing — then ask the next question. Keep responses concise and encouraging.`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system,
    messages,
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  return { statusCode: 200, headers, body: JSON.stringify({ text }) };
};
