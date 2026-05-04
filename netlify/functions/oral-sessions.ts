import { neon } from '@neondatabase/serverless';
import type { Handler } from '@netlify/functions';
import { createHmac, timingSafeEqual } from 'crypto';

const sql = neon(process.env.DATABASE_URL!);

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
  try {
    if (event.httpMethod === 'GET') {
      const subjectId = event.queryStringParameters?.subjectId;
      const rows = subjectId
        ? await sql`
            SELECT id, subject_id as "subjectId", title, topic, language, messages, created_at as "createdAt"
            FROM oral_sessions WHERE subject_id = ${subjectId} ORDER BY created_at ASC
          `
        : await sql`
            SELECT id, subject_id as "subjectId", title, topic, language, messages, created_at as "createdAt"
            FROM oral_sessions ORDER BY created_at ASC
          `;
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    if (event.httpMethod === 'POST') {
      const { id, subjectId, title, topic, language, messages, createdAt } = JSON.parse(event.body!);
      await sql`
        INSERT INTO oral_sessions (id, subject_id, title, topic, language, messages, created_at)
        VALUES (${id}, ${subjectId}, ${title}, ${topic}, ${language}, ${JSON.stringify(messages)}, ${createdAt})
      `;
      return { statusCode: 201, headers, body: JSON.stringify({ id }) };
    }

    if (event.httpMethod === 'PUT') {
      const { id, title, topic, language, messages } = JSON.parse(event.body!);
      await sql`
        UPDATE oral_sessions SET title = ${title}, topic = ${topic}, language = ${language}, messages = ${JSON.stringify(messages)}
        WHERE id = ${id}
      `;
      return { statusCode: 200, headers, body: JSON.stringify({ id }) };
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      await sql`DELETE FROM oral_sessions WHERE id = ${id}`;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};
