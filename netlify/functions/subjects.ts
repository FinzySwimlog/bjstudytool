import { neon } from '@neondatabase/serverless';
import type { Handler } from '@netlify/functions';

const sql = neon(process.env.DATABASE_URL!);

export const handler: Handler = async (event) => {
  const headers = { 'Content-Type': 'application/json' };
  try {
    if (event.httpMethod === 'GET') {
      const rows = await sql`
        SELECT id, title, emoji, color, created_at as "createdAt"
        FROM subjects ORDER BY created_at ASC
      `;
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    if (event.httpMethod === 'POST') {
      const { id, title, emoji, color, createdAt } = JSON.parse(event.body!);
      await sql`
        INSERT INTO subjects (id, title, emoji, color, created_at)
        VALUES (${id}, ${title}, ${emoji}, ${color}, ${createdAt})
      `;
      return { statusCode: 201, headers, body: JSON.stringify({ id }) };
    }

    if (event.httpMethod === 'PUT') {
      const { id, title, emoji, color } = JSON.parse(event.body!);
      await sql`
        UPDATE subjects SET title = ${title}, emoji = ${emoji}, color = ${color}
        WHERE id = ${id}
      `;
      return { statusCode: 200, headers, body: JSON.stringify({ id }) };
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      await sql`DELETE FROM subjects WHERE id = ${id}`;
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(err) }) };
  }
};
