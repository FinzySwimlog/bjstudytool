import { session } from './session';

export async function uploadToImageKit(file: File): Promise<string> {
  const authRes = await fetch('/api/imagekit-auth', {
    headers: { Authorization: `Bearer ${session.get()}` },
  });
  if (!authRes.ok) throw new Error('Failed to get upload credentials');
  const { token, expire, signature, publicKey } = await authRes.json();

  const form = new FormData();
  form.append('file', file);
  form.append('fileName', `flashcard_${Date.now()}_${file.name}`);
  form.append('publicKey', publicKey);
  form.append('signature', signature);
  form.append('expire', String(expire));
  form.append('token', token);
  form.append('folder', '/flashcards');

  const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Image upload failed');
  return data.url as string;
}
