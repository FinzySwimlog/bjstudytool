import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Layers, MessageCircle, FileText, Trash2, ChevronRight, Zap, Pencil, Check, X } from 'lucide-react';
import { storage } from '../lib/storage';
import { generateFlashcards, generateSummary } from '../lib/ai';
import type { Subject, FlashcardSet, OralSession } from '../types';

type Tab = 'flashcards' | 'oral' | 'summary';

export default function SubjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [tab, setTab] = useState<Tab>('flashcards');

  // Flashcard state
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [showFCModal, setShowFCModal] = useState(false);
  const [fcMode, setFCMode] = useState<'ai' | 'manual'>('ai');
  const [fcTitle, setFCTitle] = useState('');
  const [fcContent, setFCContent] = useState('');
  const [fcLoading, setFCLoading] = useState(false);
  const [fcError, setFCError] = useState('');

  // Oral state
  const [oralSessions, setOralSessions] = useState<OralSession[]>([]);
  const [showOralModal, setShowOralModal] = useState(false);
  const [oralTitle, setOralTitle] = useState('');
  const [oralTopic, setOralTopic] = useState('');
  const [oralLang, setOralLang] = useState('English');

  // Summary state
  const [summaryContent, setSummaryContent] = useState('');
  const [summaryResult, setSummaryResult] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // Rename state
  const [renamingSetId, setRenamingSetId] = useState<string | null>(null);
  const [renameSetValue, setRenameSetValue] = useState('');
  const renameSetRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const subjects = storage.getSubjects();
    const found = subjects.find((s) => s.id === id);
    if (!found) { navigate('/'); return; }
    setSubject(found);
    setFlashcardSets(storage.getFlashcardSets().filter((f) => f.subjectId === id));
    setOralSessions(storage.getOralSessions().filter((o) => o.subjectId === id));
  }, [id, navigate]);

  async function createFlashcardSet() {
    if (!fcTitle.trim() || !fcContent.trim()) return;
    setFCLoading(true);
    setFCError('');
    try {
      const cards = await generateFlashcards(fcContent);
      const newSet: FlashcardSet = {
        id: crypto.randomUUID(),
        subjectId: id!,
        title: fcTitle.trim(),
        cards,
        createdAt: Date.now(),
      };
      const all = storage.getFlashcardSets();
      const updated = [...all, newSet];
      storage.saveFlashcardSets(updated);
      setFlashcardSets(updated.filter((f) => f.subjectId === id));
      setShowFCModal(false);
      setFCTitle('');
      setFCContent('');
      setFCMode('ai');
    } catch (e) {
      setFCError(e instanceof Error ? e.message : 'Failed to generate flashcards');
    } finally {
      setFCLoading(false);
    }
  }

  function createEmptySet() {
    if (!fcTitle.trim()) return;
    const newSet: FlashcardSet = {
      id: crypto.randomUUID(),
      subjectId: id!,
      title: fcTitle.trim(),
      cards: [],
      createdAt: Date.now(),
    };
    const all = storage.getFlashcardSets();
    storage.saveFlashcardSets([...all, newSet]);
    setShowFCModal(false);
    setFCTitle('');
    navigate(`/subject/${id}/flashcards/${newSet.id}/edit`);
  }

  function deleteFlashcardSet(setId: string) {
    const all = storage.getFlashcardSets();
    const updated = all.filter((f) => f.id !== setId);
    storage.saveFlashcardSets(updated);
    setFlashcardSets(updated.filter((f) => f.subjectId === id));
  }

  function createOralSession() {
    if (!oralTitle.trim() || !oralTopic.trim()) return;
    const session: OralSession = {
      id: crypto.randomUUID(),
      subjectId: id!,
      title: oralTitle.trim(),
      topic: oralTopic.trim(),
      language: oralLang,
      messages: [],
      createdAt: Date.now(),
    };
    const all = storage.getOralSessions();
    const updated = [...all, session];
    storage.saveOralSessions(updated);
    setOralSessions(updated.filter((o) => o.subjectId === id));
    setShowOralModal(false);
    setOralTitle('');
    setOralTopic('');
    navigate(`/subject/${id}/oral/${session.id}`);
  }

  function startRenameSet(setId: string, currentTitle: string, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingSetId(setId);
    setRenameSetValue(currentTitle);
    setTimeout(() => renameSetRef.current?.focus(), 0);
  }

  function commitRenameSet(setId: string) {
    if (!renameSetValue.trim()) { setRenamingSetId(null); return; }
    const all = storage.getFlashcardSets();
    const updated = all.map((s) => s.id === setId ? { ...s, title: renameSetValue.trim() } : s);
    storage.saveFlashcardSets(updated);
    setFlashcardSets(updated.filter((f) => f.subjectId === id));
    setRenamingSetId(null);
  }

  function deleteOralSession(sessionId: string) {
    const all = storage.getOralSessions();
    const updated = all.filter((o) => o.id !== sessionId);
    storage.saveOralSessions(updated);
    setOralSessions(updated.filter((o) => o.subjectId === id));
  }

  async function runSummary() {
    if (!summaryContent.trim()) return;
    setSummaryLoading(true);
    setSummaryError('');
    setSummaryResult('');
    try {
      const result = await generateSummary(summaryContent);
      setSummaryResult(result);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : 'Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  }

  if (!subject) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'flashcards', label: 'Flashcards', icon: <Layers size={16} /> },
    { key: 'oral', label: 'Oral Prep', icon: <MessageCircle size={16} /> },
    { key: 'summary', label: 'Summariser', icon: <FileText size={16} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className={`w-1 h-10 rounded-full bg-gradient-to-b ${subject.color} shrink-0`} />
        <div>
          <h1 className="text-3xl font-bold text-white">{subject.title}</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {flashcardSets.length} flashcard set{flashcardSets.length !== 1 ? 's' : ''} · {oralSessions.length} oral session{oralSessions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-8 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white'}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Flashcards Tab */}
      {tab === 'flashcards' && (
        <div>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-white font-semibold text-lg">Flashcard Sets</h2>
            <button
              onClick={() => setShowFCModal(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={15} />
              New Set
            </button>
          </div>
          {flashcardSets.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
              <Layers size={40} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 mb-1">No flashcard sets yet</p>
              <p className="text-white/25 text-sm">Paste in your notes and AI will generate cards</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {flashcardSets.map((set) => (
                <div
                  key={set.id}
                  onClick={() => renamingSetId !== set.id && navigate(`/subject/${id}/flashcards/${set.id}`)}
                  className="group flex items-center justify-between p-4 bg-white/5 border border-white/10 hover:border-violet-500/50 rounded-xl cursor-pointer transition-all hover:bg-white/8"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    {renamingSetId === set.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          ref={renameSetRef}
                          value={renameSetValue}
                          onChange={(e) => setRenameSetValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRenameSet(set.id);
                            if (e.key === 'Escape') setRenamingSetId(null);
                          }}
                          className="flex-1 bg-white/10 border border-violet-500 rounded-lg px-2.5 py-1 text-white text-sm focus:outline-none"
                        />
                        <button onClick={() => commitRenameSet(set.id)} className="p-1 text-emerald-400 hover:text-emerald-300 shrink-0">
                          <Check size={15} />
                        </button>
                        <button onClick={() => setRenamingSetId(null)} className="p-1 text-white/40 hover:text-white shrink-0">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-white font-medium truncate">{set.title}</p>
                    )}
                    <p className="text-white/40 text-sm mt-0.5">{set.cards.length} cards · {new Date(set.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => startRenameSet(set.id, set.title, e)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFlashcardSet(set.id); }}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={18} className="text-white/30" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Oral Prep Tab */}
      {tab === 'oral' && (
        <div>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-white font-semibold text-lg">Oral Prep Sessions</h2>
            <button
              onClick={() => setShowOralModal(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={15} />
              New Session
            </button>
          </div>
          {oralSessions.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
              <MessageCircle size={40} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 mb-1">No oral sessions yet</p>
              <p className="text-white/25 text-sm">Practice speaking about topics with AI feedback</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {oralSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => navigate(`/subject/${id}/oral/${session.id}`)}
                  className="group flex items-center justify-between p-4 bg-white/5 border border-white/10 hover:border-violet-500/50 rounded-xl cursor-pointer transition-all"
                >
                  <div>
                    <p className="text-white font-medium">{session.title}</p>
                    <p className="text-white/40 text-sm mt-0.5">
                      {session.language !== 'English' ? `${session.language} · ` : ''}{session.topic} · {session.messages.length} messages
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteOralSession(session.id); }}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={18} className="text-white/30" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Tab */}
      {tab === 'summary' && (
        <div>
          <h2 className="text-white font-semibold text-lg mb-5">AI Summariser</h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="text-white/60 text-sm mb-2 block">Paste your notes</label>
              <textarea
                value={summaryContent}
                onChange={(e) => setSummaryContent(e.target.value)}
                placeholder="Paste lecture notes, textbook content, anything..."
                rows={14}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-violet-500 text-sm resize-none transition-colors"
              />
              {summaryError && <p className="text-red-400 text-sm mt-2">{summaryError}</p>}
              <button
                onClick={runSummary}
                disabled={summaryLoading || !summaryContent.trim()}
                className="mt-3 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Zap size={15} />
                {summaryLoading ? 'Generating...' : 'Generate Summary'}
              </button>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-2 block">Summary</label>
              {summaryResult ? (
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 whitespace-pre-wrap leading-relaxed h-full overflow-y-auto">
                  {summaryResult}
                </div>
              ) : (
                <div className="h-full min-h-48 border border-dashed border-white/10 rounded-xl flex items-center justify-center">
                  <p className="text-white/25 text-sm">Summary will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flashcard Modal */}
      {showFCModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowFCModal(false)}
        >
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-white font-semibold text-xl mb-5">New Flashcard Set</h2>

            <div className="mb-4">
              <label className="text-white/60 text-sm mb-1.5 block">Set title</label>
              <input
                autoFocus
                value={fcTitle}
                onChange={(e) => setFCTitle(e.target.value)}
                placeholder="e.g. Chapter 3 — Cell Biology"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-4">
              <button
                onClick={() => setFCMode('ai')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${fcMode === 'ai' ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white'}`}
              >
                Generate with AI
              </button>
              <button
                onClick={() => setFCMode('manual')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${fcMode === 'manual' ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white'}`}
              >
                Start empty
              </button>
            </div>

            {fcMode === 'ai' && (
              <div className="mb-4">
                <label className="text-white/60 text-sm mb-1.5 block">Paste your content</label>
                <textarea
                  value={fcContent}
                  onChange={(e) => setFCContent(e.target.value)}
                  placeholder="Paste notes, definitions, lecture content..."
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm resize-none transition-colors"
                />
              </div>
            )}

            {fcMode === 'manual' && (
              <p className="text-white/30 text-sm mb-4">Creates an empty set — you'll be taken to the editor to add cards manually.</p>
            )}

            {fcError && <p className="text-red-400 text-sm mb-3">{fcError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowFCModal(false); setFCError(''); }}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 hover:text-white transition-all text-sm"
              >
                Cancel
              </button>
              {fcMode === 'ai' ? (
                <button
                  onClick={createFlashcardSet}
                  disabled={fcLoading || !fcTitle.trim() || !fcContent.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
                >
                  <Zap size={15} />
                  {fcLoading ? 'Generating...' : 'Generate Cards'}
                </button>
              ) : (
                <button
                  onClick={createEmptySet}
                  disabled={!fcTitle.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
                >
                  Create Set
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Oral Modal */}
      {showOralModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowOralModal(false)}
        >
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-semibold text-xl mb-5">New Oral Prep Session</h2>
            <div className="mb-4">
              <label className="text-white/60 text-sm mb-1.5 block">Session title</label>
              <input
                autoFocus
                value={oralTitle}
                onChange={(e) => setOralTitle(e.target.value)}
                placeholder="e.g. World War I Causes"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="mb-4">
              <label className="text-white/60 text-sm mb-1.5 block">Topic to be examined on</label>
              <input
                value={oralTopic}
                onChange={(e) => setOralTopic(e.target.value)}
                placeholder="e.g. The causes of World War I"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="mb-6">
              <label className="text-white/60 text-sm mb-1.5 block">Language</label>
              <select
                value={oralLang}
                onChange={(e) => setOralLang(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
              >
                {['English', 'French', 'Spanish', 'German', 'Italian', 'Portuguese', 'Irish', 'Mandarin', 'Japanese'].map((l) => (
                  <option key={l} value={l} className="bg-[#1a1a24]">{l}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowOralModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 hover:text-white transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={createOralSession}
                disabled={!oralTitle.trim() || !oralTopic.trim()}
                className="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
              >
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
