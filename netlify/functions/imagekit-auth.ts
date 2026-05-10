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
  if (!authorized(event)) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 600;
  const signature = createHmac('sha1', process.env.IMAGEKIT_PRIVATE_KEY!)
    .update(token + expire)
    .digest('hex');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      token,
      expire,
      signature,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    }),
  };
};
