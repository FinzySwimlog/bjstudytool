import type { Subject, FlashcardSet, OralSession } from '../types';

const KEYS = {
  subjects: 'study_subjects',
  flashcardSets: 'study_flashcard_sets',
  oralSessions: 'study_oral_sessions',
};

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export const storage = {
  getSubjects: (): Subject[] => load<Subject>(KEYS.subjects),
  saveSubjects: (s: Subject[]) => save(KEYS.subjects, s),

  getFlashcardSets: (): FlashcardSet[] => load<FlashcardSet>(KEYS.flashcardSets),
  saveFlashcardSets: (s: FlashcardSet[]) => save(KEYS.flashcardSets, s),

  getOralSessions: (): OralSession[] => load<OralSession>(KEYS.oralSessions),
  saveOralSessions: (s: OralSession[]) => save(KEYS.oralSessions, s),
};
