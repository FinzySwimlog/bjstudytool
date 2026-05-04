import Anthropic from '@anthropic-ai/sdk';
import type { Flashcard, QuizQuestion } from '../types';

function getClient() {
  const key = localStorage.getItem('anthropic_api_key');
  if (!key) throw new Error('No API key set. Add your Anthropic API key in Settings.');
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
}

function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  return text.trim();
}

export async function generateFlashcards(content: string): Promise<Flashcard[]> {
  const client = getClient();
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Generate flashcards from the following study content. Return ONLY a valid JSON array of objects with "term" and "definition" fields. No markdown, no explanation, just the JSON array.

Content:
${content}`,
      },
    ],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  const json = JSON.parse(extractJSON(text));
  return json.map((card: { term: string; definition: string }) => ({
    id: crypto.randomUUID(),
    term: card.term,
    definition: card.definition,
    tricky: false,
  }));
}

export async function generateSummary(content: string): Promise<string> {
  const client = getClient();
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Create a concise, well-structured study summary of the following content. Use bullet points and clear headings. Focus on the most important concepts and definitions a student needs to remember.

Content:
${content}`,
      },
    ],
  });
  return msg.content[0].type === 'text' ? msg.content[0].text : '';
}

export async function generateQuizQuestions(
  cards: { term: string; definition: string }[]
): Promise<QuizQuestion[]> {
  const client = getClient();
  const cardList = cards.map((c) => `Term: ${c.term}\nDefinition: ${c.definition}`).join('\n\n');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Create a multiple-choice quiz from these flashcards. Return ONLY a valid JSON array. Each object must have: "question" (string), "correct" (string, the correct answer), "options" (array of 4 strings including the correct one, shuffled). No markdown, no explanation, just the JSON array.

Flashcards:
${cardList}`,
      },
    ],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  return JSON.parse(extractJSON(text));
}

export async function* streamOralResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  topic: string,
  language: string
): AsyncGenerator<string> {
  const client = getClient();

  const systemPrompt = language && language !== 'English'
    ? `You are a language tutor conducting an oral exam preparation session in ${language}. The topic is: "${topic}". Ask questions about the topic in ${language}, evaluate the student's ${language} responses for both content accuracy and language correctness. Give brief feedback in ${language} then English. Keep responses concise.`
    : `You are an exam preparation tutor. The topic is: "${topic}". Ask probing questions to test the student's understanding. After each answer, give brief targeted feedback — what was good, what was missing — then ask the next question. Keep responses concise and encouraging.`;

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}
