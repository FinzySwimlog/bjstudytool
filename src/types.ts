export interface Subject {
  id: string;
  title: string;
  emoji: string;
  color: string;
  createdAt: number;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  tricky: boolean;
}

export interface QuizQuestion {
  question: string;
  correct: string;
  options: string[];
}

export interface FlashcardSet {
  id: string;
  subjectId: string;
  title: string;
  cards: Flashcard[];
  quiz?: QuizQuestion[];
  createdAt: number;
}

export interface OralSession {
  id: string;
  subjectId: string;
  title: string;
  topic: string;
  language: string;
  messages: OralMessage[];
  createdAt: number;
}

export interface OralMessage {
  role: 'ai' | 'user';
  content: string;
}

export type ToolType = 'flashcards' | 'quiz' | 'oral' | 'summary';
