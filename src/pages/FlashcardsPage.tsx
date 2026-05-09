import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RotateCcw, Star, Trophy, Brain, Pencil, RefreshCw, Shuffle, Expand, Shrink, ArrowLeftRight, MoreVertical, Trash2, MessageSquarePlus, Send, Check } from 'lucide-react';
import { storage } from '../lib/storage';
import { generateQuizQuestions, editFlashcards } from '../lib/ai';
import type { FlashcardSet, QuizQuestion, Flashcard } from '../types';

type Mode = 'study' | 'quiz' | 'done';

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDisplayCards(cards: Flashcard[], isShuffled: boolean, isTrickyOnly: boolean) {
  const base = isTrickyOnly ? cards.filter((c) => c.tricky) : cards;
  return isShuffled ? fisherYates(base) : base;
}

export default function FlashcardsPage() {
  const { id, setId } = useParams<{ id: string; setId: string }>();
  const navigate = useNavigate();
  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [displayCards, setDisplayCards] = useState<Flashcard[]>([]);
  const [shuffled, setShuffled] = useState(false);
  const [trickyOnly, setTrickyOnly] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  type EditMsg = { role: 'user' | 'assistant'; content: string; cardsBefore?: number; cardsAfter?: number };
  const [showEditChat, setShowEditChat] = useState(false);
  const [editMessages, setEditMessages] = useState<EditMsg[]>([]);
  const [editInput, setEditInput] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [pendingCards, setPendingCards] = useState<Flashcard[] | null>(null);
  const editBottomRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('study');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState('');

  useEffect(() => {
    storage.getFlashcardSets(id).then((sets) => {
      const found = sets.find((s) => s.id === setId);
      if (!found) { navigate(`/subject/${id}`); return; }
      setSet(found);
      setDisplayCards(found.cards);
    });
  }, [setId, id, navigate]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!focusMode || !set) return;
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); }
    if (e.key === 'Escape') setFocusMode(false);
  }, [focusMode, set, displayCards, currentIdx]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    editBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [editMessages, editLoading]);

  async function sendEditMessage() {
    if (!editInput.trim() || editLoading || !set) return;
    const userMessage = editInput.trim();
    setEditInput('');
    setEditMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setEditLoading(true);
    try {
      const currentCards = pendingCards ?? set.cards;
      const history = editMessages.map((m) => ({ role: m.role, content: m.content }));
      const result = await editFlashcards(currentCards, history, userMessage);
      const changed = JSON.stringify(result.cards) !== JSON.stringify(currentCards);
      setEditMessages((prev) => [...prev, {
        role: 'assistant',
        content: result.message,
        cardsBefore: changed ? currentCards.length : undefined,
        cardsAfter: changed ? result.cards.length : undefined,
      }]);
      if (changed) setPendingCards(result.cards);
    } catch (e) {
      setEditMessages((prev) => [...prev, { role: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong' }]);
    } finally {
      setEditLoading(false);
    }
  }

  function applyEditChanges() {
    if (!pendingCards || !set) return;
    const updated = { ...set, cards: pendingCards };
    saveSet(updated);
    setDisplayCards(buildDisplayCards(pendingCards, shuffled, trickyOnly));
    setCurrentIdx(0);
    setPendingCards(null);
    setEditMessages((prev) => [...prev, { role: 'assistant', content: `Changes applied — set now has ${pendingCards.length} card${pendingCards.length !== 1 ? 's' : ''}.` }]);
  }

  async function deleteSet() {
    setConfirmDelete(false);
    await storage.deleteFlashcardSet(setId!);
    navigate(`/subject/${id}`);
  }

  async function saveSet(updated: FlashcardSet) {
    setSet(updated);
    await storage.updateFlashcardSet(updated);
  }

  function toggleShuffle() {
    if (!set) return;
    setCurrentIdx(0);
    setFlipped(false);
    const next = !shuffled;
    setShuffled(next);
    setDisplayCards(buildDisplayCards(set.cards, next, trickyOnly));
  }

  function toggleTrickyOnly() {
    if (!set) return;
    setCurrentIdx(0);
    setFlipped(false);
    const next = !trickyOnly;
    setTrickyOnly(next);
    setDisplayCards(buildDisplayCards(set.cards, shuffled, next));
  }

  function toggleTricky() {
    if (!set) return;
    const cardId = displayCards[currentIdx].id;
    const updated = {
      ...set,
      cards: set.cards.map((c) => c.id === cardId ? { ...c, tricky: !c.tricky } : c),
    };
    saveSet(updated);
    setDisplayCards((prev) =>
      prev.map((c) => c.id === cardId ? { ...c, tricky: !c.tricky } : c)
    );
  }

  function next() {
    if (!set) return;
    setCurrentIdx((i) => Math.min(i + 1, displayCards.length - 1));
    setFlipped(false);
  }

  function prev() {
    setCurrentIdx((i) => Math.max(i - 1, 0));
    setFlipped(false);
  }

  async function loadQuiz(forceRegenerate = false) {
    if (!set) return;
    if (!forceRegenerate && set.quiz && set.quiz.length > 0) {
      setQuizQuestions(set.quiz);
      setQuizIdx(0);
      setQuizScore(0);
      setQuizSelected(null);
      setMode('quiz');
      return;
    }
    setQuizLoading(true);
    setQuizError('');
    try {
      const questions = await generateQuizQuestions(
        set.cards.map((c) => ({ term: c.term, definition: c.definition }))
      );
      const updated = { ...set, quiz: questions };
      saveSet(updated);
      setQuizQuestions(questions);
      setQuizIdx(0);
      setQuizScore(0);
      setQuizSelected(null);
      setMode('quiz');
    } catch (e) {
      setQuizError(e instanceof Error ? e.message : 'Failed to generate quiz');
    } finally {
      setQuizLoading(false);
    }
  }

  function selectAnswer(option: string) {
    if (quizSelected !== null) return;
    setQuizSelected(option);
    if (option === quizQuestions[quizIdx].correct) setQuizScore((s) => s + 1);
  }

  function nextQuestion() {
    if (quizIdx + 1 >= quizQuestions.length) {
      setMode('done');
    } else {
      setQuizIdx((i) => i + 1);
      setQuizSelected(null);
    }
  }

  if (!set) return (
    <div className="flex justify-center py-24">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  const card = displayCards[currentIdx];
  const trickyCount = set.cards.filter((c) => c.tricky).length;
  const hasSavedQuiz = !!(set.quiz && set.quiz.length > 0);

  const CardFace = ({ tall = false }: { tall?: boolean }) => (
    <div className="perspective-1000 w-full">
      <div
        className={`card-flip relative w-full cursor-pointer ${flipped ? 'flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
        style={{ height: tall ? '360px' : '280px' }}
      >
        <div className="backface-hidden absolute inset-0 bg-[#1a1a24] border border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
          <p className="text-white text-2xl font-semibold">{swapped ? card.definition : card.term}</p>
        </div>
        <div className="backface-hidden rotate-y-180 absolute inset-0 bg-violet-900/30 border border-violet-500/30 rounded-2xl flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
          <div className="text-white text-lg leading-relaxed w-full text-center">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="text-violet-300 font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="text-left list-disc list-inside space-y-1 mt-1">{children}</ul>,
                ol: ({ children }) => <ol className="text-left list-decimal list-inside space-y-1 mt-1">{children}</ol>,
                li: ({ children }) => <li className="text-white/90">{children}</li>,
              }}
            >
              {swapped ? card.term : card.definition}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );

  const ProgressBar = () => (
    <div className="flex gap-1 w-full mb-4">
      {displayCards.map((c, i) => (
        <div
          key={c.id}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i === currentIdx ? 'bg-violet-500' : c.tricky ? 'bg-amber-500' : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  );

  const Filters = () => (
    <div className="flex gap-2 mb-4">
      <button
        onClick={toggleShuffle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${shuffled ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
      >
        <Shuffle size={13} />
        {shuffled ? 'Shuffled' : 'Shuffle'}
      </button>
      <button
        onClick={toggleTrickyOnly}
        disabled={trickyCount === 0 && !trickyOnly}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${trickyOnly ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-white/5 text-white/40 hover:text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed'}`}
      >
        <Star size={13} className={trickyOnly ? 'fill-amber-300 text-amber-300' : ''} />
        Tricky{trickyCount > 0 ? ` (${trickyCount})` : ''}
      </button>
      <button
        onClick={() => { setSwapped((s) => !s); setFlipped(false); }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${swapped ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
      >
        <ArrowLeftRight size={13} />
        Swap
      </button>
    </div>
  );

  return (
    <>
      {/* Focus Mode Overlay */}
      {focusMode && card && (
        <div className="fixed inset-0 bg-[#0a0a0e] z-50 flex items-center justify-center">
          <button
            onClick={() => setFocusMode(false)}
            className="absolute top-5 right-5 p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
            title="Exit focus mode (Esc)"
          >
            <Shrink size={16} />
          </button>
          <div className="w-full max-w-3xl px-8">
            <ProgressBar />
            <CardFace tall />
            <div className="flex items-center justify-between mt-6">
              <button onClick={prev} disabled={currentIdx === 0} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm transition-all">
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="flex items-center gap-4">
                <span className="text-white/40 text-sm">{currentIdx + 1} / {displayCards.length}</span>
                <button onClick={toggleTricky} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${card.tricky ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}>
                  <Star size={14} className={card.tricky ? 'fill-amber-300 text-amber-300' : ''} />
                  Tricky
                </button>
              </div>
              <button onClick={next} disabled={currentIdx === displayCards.length - 1} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm transition-all">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate(`/subject/${id}`)}
          className="flex items-center gap-1 text-white/50 hover:text-white text-sm mb-5 transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white leading-snug">{set.title}</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {set.cards.length} cards{trickyCount > 0 ? ` · ${trickyCount} tricky` : ''}
            </p>
          </div>

          {/* Burger menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu((s) => !s)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
            >
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden">
                <button
                  onClick={() => { setFocusMode(true); setFlipped(false); setShowMenu(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Expand size={15} /> Focus Mode
                </button>
                <button
                  onClick={() => { navigate(`/subject/${id}/flashcards/${setId}/edit`); setShowMenu(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Pencil size={15} /> Edit Set
                </button>
                <button
                  onClick={() => { setEditMessages([]); setPendingCards(null); setEditInput(''); setShowEditChat(true); setShowMenu(false); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-violet-400 hover:text-violet-300 hover:bg-white/5 transition-colors"
                >
                  <MessageSquarePlus size={15} /> AI Edit
                </button>
                {mode === 'study' && (
                  <>
                    <button
                      onClick={() => { loadQuiz(false); setShowMenu(false); }}
                      disabled={quizLoading}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-amber-400 hover:text-amber-300 hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                      <Brain size={15} /> {hasSavedQuiz ? 'Take Quiz' : 'Generate Quiz'}
                    </button>
                    {hasSavedQuiz && (
                      <button
                        onClick={() => { loadQuiz(true); setShowMenu(false); }}
                        disabled={quizLoading}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={15} /> Regenerate Quiz
                      </button>
                    )}
                  </>
                )}
                {mode !== 'study' && (
                  <button
                    onClick={() => { setMode('study'); setCurrentIdx(0); setFlipped(false); setShowMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <RotateCcw size={15} /> Back to Study
                  </button>
                )}
                <div className="border-t border-white/10">
                  <button
                    onClick={() => { setConfirmDelete(true); setShowMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                  >
                    <Trash2 size={15} /> Delete Set
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {quizError && <p className="text-red-400 text-sm mb-4">{quizError}</p>}

        {/* Study Mode */}
        {mode === 'study' && card && (
          <>
            <ProgressBar />
            <Filters />
            <CardFace />
            <div className="flex items-stretch gap-3 mt-4">
              <button
                onClick={prev}
                disabled={currentIdx === 0}
                className="flex-1 flex items-center justify-center gap-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all"
              >
                <ChevronLeft size={20} />
                <span className="text-sm font-medium">Prev</span>
              </button>
              <div className="flex flex-col items-center justify-center gap-1.5 px-2">
                <span className="text-white/40 text-xs">{currentIdx + 1} / {displayCards.length}</span>
                <button
                  onClick={toggleTricky}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${card.tricky ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
                >
                  <Star size={11} className={card.tricky ? 'fill-amber-300 text-amber-300' : ''} />
                  Tricky
                </button>
              </div>
              <button
                onClick={next}
                disabled={currentIdx === displayCards.length - 1}
                className="flex-1 flex items-center justify-center gap-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all"
              >
                <span className="text-sm font-medium">Next</span>
                <ChevronRight size={20} />
              </button>
            </div>
          </>
        )}

        {/* Quiz Mode */}
        {mode === 'quiz' && quizQuestions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/50 text-sm">Question {quizIdx + 1} of {quizQuestions.length}</p>
              <p className="text-white/50 text-sm">Score: {quizScore}/{quizIdx}</p>
            </div>
            <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 mb-5">
              <p className="text-white text-xl font-medium">{quizQuestions[quizIdx].question}</p>
            </div>
            <div className="grid gap-3 mb-5">
              {quizQuestions[quizIdx].options.map((option) => {
                const isCorrect = option === quizQuestions[quizIdx].correct;
                const isSelected = option === quizSelected;
                let cls = 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-violet-500/50 cursor-pointer';
                if (quizSelected !== null) {
                  if (isCorrect) cls = 'bg-emerald-600/20 border-emerald-500 text-emerald-300 cursor-default';
                  else if (isSelected) cls = 'bg-red-600/20 border-red-500 text-red-300 cursor-default';
                  else cls = 'bg-white/3 border-white/5 text-white/30 cursor-default';
                }
                return (
                  <button key={option} onClick={() => selectAnswer(option)} className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all ${cls}`}>
                    {option}
                  </button>
                );
              })}
            </div>
            {quizSelected !== null && (
              <div className="flex justify-end">
                <button onClick={nextQuestion} className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors">
                  {quizIdx + 1 === quizQuestions.length ? 'See Results' : 'Next Question'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {mode === 'done' && (
          <div className="text-center py-16">
            <Trophy size={56} className="text-amber-400 mx-auto mb-5" />
            <h2 className="text-white text-3xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-white/50 mb-2">
              You scored <span className="text-white font-semibold">{quizScore}</span> out of{' '}
              <span className="text-white font-semibold">{quizQuestions.length}</span>
            </p>
            <p className="text-white/30 text-sm mb-8">{Math.round((quizScore / quizQuestions.length) * 100)}% correct</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={() => { setQuizIdx(0); setQuizScore(0); setQuizSelected(null); setMode('quiz'); }} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors">
                Retry Quiz
              </button>
              <button onClick={() => loadQuiz(true)} disabled={quizLoading} className="bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-2">
                <RefreshCw size={14} /> New Quiz
              </button>
              <button onClick={() => { setMode('study'); setCurrentIdx(0); setFlipped(false); }} className="bg-white/10 hover:bg-white/15 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors">
                Back to Study
              </button>
            </div>
          </div>
        )}
      </div>

      {showEditChat && (
        <div className="fixed inset-0 bg-[#0f0f13] z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <button
              onClick={() => setShowEditChat(false)}
              className="flex items-center gap-1 text-white/50 hover:text-white text-sm transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <div className="text-center">
              <p className="text-white font-medium text-sm">AI Edit</p>
              <p className="text-white/40 text-xs truncate max-w-[160px]">{set.title}</p>
            </div>
            {pendingCards ? (
              <button
                onClick={applyEditChanges}
                className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                <Check size={13} /> Apply
              </button>
            ) : (
              <div className="w-16" />
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {editMessages.length === 0 && (
              <div className="text-center py-16">
                <MessageSquarePlus size={36} className="text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Describe what you'd like to change</p>
                <p className="text-white/25 text-xs mt-1 max-w-xs mx-auto">e.g. "consolidate the first 3 cards into one" or "add a card about the nucleus"</p>
              </div>
            )}
            {editMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-white/5 border border-white/10 text-white/90'}`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  {msg.cardsBefore !== undefined && (
                    <p className="text-xs mt-1.5 opacity-60">{msg.cardsBefore} → {msg.cardsAfter} cards</p>
                  )}
                </div>
              </div>
            ))}
            {editLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={editBottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-white/10 p-4">
            {pendingCards && (
              <div className="flex items-center justify-between bg-violet-600/15 border border-violet-500/30 rounded-xl px-3 py-2 mb-3">
                <span className="text-violet-300 text-xs">
                  {pendingCards.length !== set.cards.length
                    ? `${set.cards.length} → ${pendingCards.length} cards pending`
                    : 'Changes pending'}
                </span>
                <div className="flex gap-3">
                  <button onClick={() => setPendingCards(null)} className="text-white/40 hover:text-white text-xs transition-colors">Discard</button>
                  <button onClick={applyEditChanges} className="text-violet-300 hover:text-violet-200 text-xs font-medium transition-colors">Apply</button>
                </div>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                value={editInput}
                onChange={(e) => setEditInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendEditMessage(); } }}
                placeholder="Ask AI to edit this set…"
                rows={2}
                disabled={editLoading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 text-sm resize-none transition-colors"
              />
              <button
                onClick={sendEditMessage}
                disabled={editLoading || !editInput.trim()}
                className="p-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setConfirmDelete(false)}
        >
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-white font-semibold text-lg mb-2">Delete set?</h2>
            <p className="text-white/50 text-sm mb-6">
              "{set.title}" and all its cards will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 hover:text-white transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={deleteSet}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
