import { createHmac } from 'crypto';
import type { Handler } from '@netlify/functions';

function createToken(): string {
  const timestamp = String(Date.now());
  const sig = createHmac('sha256', process.env.APP_SECRET!)
    .update(timestamp)
    .digest('hex');
  return `${timestamp}.${sig}`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const { password } = JSON.parse(event.body || '{}');
  if (!password || password !== process.env.APP_PASSWORD) {
    await new Promise((r) => setTimeout(r, 500)); // slow brute-force
    return { statusCode: 401, body: JSON.stringify({ ok: false }) };
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, token: createToken() }),
  };
};
