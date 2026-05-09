import { session } from './session';
import type { Flashcard, QuizQuestion } from '../types';

async function api<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.get()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  return res.json();
}

export async function generateFlashcards(content: string): Promise<Flashcard[]> {
  const res = await fetch('/api/generate-flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.get()}` },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value, { stream: true });
  }

  const resultLine = accumulated.split('\n').find((l) => l.startsWith('RESULT:'));
  const errorLine = accumulated.split('\n').find((l) => l.startsWith('ERROR:'));
  if (errorLine) throw new Error(errorLine.slice(6));
  if (!resultLine) throw new Error('No result received from server');
  return JSON.parse(resultLine.slice(7));
}

export async function generateSummary(content: string): Promise<string> {
  const { text } = await api<{ text: string }>('generate-summary', { content });
  return text;
}

export async function generateQuizQuestions(
  cards: { term: string; definition: string }[]
): Promise<QuizQuestion[]> {
  return api<QuizQuestion[]>('generate-quiz', { cards });
}

export async function* streamOralResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  topic: string,
  language: string
): AsyncGenerator<string> {
  const { text } = await api<{ text: string }>('oral-chat', { messages, topic, language });
  yield text;
}
