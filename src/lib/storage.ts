import type { Subject, FlashcardSet, OralSession } from '../types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const storage = {
  getSubjects: () => request<Subject[]>('/subjects'),
  createSubject: (s: Subject) => request<void>('/subjects', { method: 'POST', body: JSON.stringify(s) }),
  updateSubject: (s: Subject) => request<void>('/subjects', { method: 'PUT', body: JSON.stringify(s) }),
  deleteSubject: (id: string) => request<void>(`/subjects?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getFlashcardSets: (subjectId?: string) =>
    request<FlashcardSet[]>(`/flashcard-sets${subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : ''}`),
  createFlashcardSet: (s: FlashcardSet) => request<void>('/flashcard-sets', { method: 'POST', body: JSON.stringify(s) }),
  updateFlashcardSet: (s: FlashcardSet) => request<void>('/flashcard-sets', { method: 'PUT', body: JSON.stringify(s) }),
  deleteFlashcardSet: (id: string) => request<void>(`/flashcard-sets?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getOralSessions: (subjectId?: string) =>
    request<OralSession[]>(`/oral-sessions${subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : ''}`),
  createOralSession: (s: OralSession) => request<void>('/oral-sessions', { method: 'POST', body: JSON.stringify(s) }),
  updateOralSession: (s: OralSession) => request<void>('/oral-sessions', { method: 'PUT', body: JSON.stringify(s) }),
  deleteOralSession: (id: string) => request<void>(`/oral-sessions?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
