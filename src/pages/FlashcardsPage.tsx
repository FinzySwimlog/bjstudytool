import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RotateCcw, Star, Trophy, Brain, Pencil, RefreshCw, Shuffle, Expand, Shrink } from 'lucide-react';
import { storage } from '../lib/storage';
import { generateQuizQuestions } from '../lib/ai';
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
    const found = storage.getFlashcardSets().find((s) => s.id === setId);
    if (!found) { navigate(`/subject/${id}`); return; }
    setSet(found);
    setDisplayCards(found.cards);
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

  function saveSet(updated: FlashcardSet) {
    setSet(updated);
    storage.saveFlashcardSets(
      storage.getFlashcardSets().map((s) => (s.id === setId ? updated : s))
    );
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
    setFlipped(false);
    setTimeout(() => setCurrentIdx((i) => Math.min(i + 1, displayCards.length - 1)), 50);
  }

  function prev() {
    setFlipped(false);
    setTimeout(() => setCurrentIdx((i) => Math.max(i - 1, 0)), 50);
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

  if (!set) return null;
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
          <p className="text-white text-2xl font-semibold">{card.term}</p>
        </div>
        <div className="backface-hidden rotate-y-180 absolute inset-0 bg-violet-900/30 border border-violet-500/30 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
          <p className="text-white text-lg leading-relaxed">{card.definition}</p>
        </div>
      </div>
    </div>
  );

  const ProgressBar = () => (
    <div className="flex gap-1 flex-1">
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

  const ToolbarBtns = () => (
    <>
      <button
        onClick={toggleShuffle}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${shuffled ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
      >
        <Shuffle size={13} />
        {shuffled ? 'Shuffled' : 'Shuffle'}
      </button>
      <button
        onClick={toggleTrickyOnly}
        disabled={trickyCount === 0 && !trickyOnly}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${trickyOnly ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-white/5 text-white/40 hover:text-white border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed'}`}
      >
        <Star size={13} className={trickyOnly ? 'fill-amber-300 text-amber-300' : ''} />
        Tricky{trickyCount > 0 ? ` (${trickyCount})` : ''}
      </button>
    </>
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
            <div className="flex items-center gap-3 mb-6">
              <ProgressBar />
              <ToolbarBtns />
            </div>

            <CardFace tall />

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={prev}
                disabled={currentIdx === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm transition-all"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="flex items-center gap-4">
                <span className="text-white/40 text-sm">{currentIdx + 1} / {displayCards.length}</span>
                <button
                  onClick={toggleTricky}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${card.tricky ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
                >
                  <Star size={14} className={card.tricky ? 'fill-amber-300 text-amber-300' : ''} />
                  Tricky
                </button>
              </div>
              <button
                onClick={next}
                disabled={currentIdx === displayCards.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm transition-all"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => navigate(`/subject/${id}`)}
              className="text-white/40 hover:text-white text-sm mb-2 transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-white">{set.title}</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {set.cards.length} cards{trickyCount > 0 ? ` · ${trickyCount} tricky` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFocusMode(true); setFlipped(false); }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Expand size={15} />
              Focus
            </button>
            <button
              onClick={() => navigate(`/subject/${id}/flashcards/${setId}/edit`)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Pencil size={15} />
              Edit Set
            </button>
            {mode === 'study' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => loadQuiz(false)}
                  disabled={quizLoading}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Brain size={15} />
                  {quizLoading ? 'Loading...' : hasSavedQuiz ? 'Take Quiz' : 'Generate Quiz'}
                </button>
                {hasSavedQuiz && (
                  <button
                    onClick={() => loadQuiz(true)}
                    disabled={quizLoading}
                    title="Regenerate quiz"
                    className="p-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg transition-colors"
                  >
                    <RefreshCw size={15} />
                  </button>
                )}
              </div>
            )}
            {mode !== 'study' && (
              <button
                onClick={() => { setMode('study'); setCurrentIdx(0); setFlipped(false); }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <RotateCcw size={15} />
                Back to Study
              </button>
            )}
          </div>
        </div>

        {quizError && <p className="text-red-400 text-sm mb-4">{quizError}</p>}

        {/* Study Mode */}
        {mode === 'study' && card && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <ProgressBar />
              <ToolbarBtns />
            </div>

            <CardFace />

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={prev}
                disabled={currentIdx === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm transition-all"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="flex items-center gap-4">
                <span className="text-white/40 text-sm">{currentIdx + 1} / {displayCards.length}</span>
                <button
                  onClick={toggleTricky}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${card.tricky ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-white/40 hover:text-white border border-white/10'}`}
                >
                  <Star size={14} className={card.tricky ? 'fill-amber-300 text-amber-300' : ''} />
                  {card.tricky ? 'Tricky' : 'Tricky'}
                </button>
              </div>
              <button
                onClick={next}
                disabled={currentIdx === displayCards.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm transition-all"
              >
                Next <ChevronRight size={16} />
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
                  <button
                    key={option}
                    onClick={() => selectAnswer(option)}
                    className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all ${cls}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {quizSelected !== null && (
              <div className="flex justify-end">
                <button
                  onClick={nextQuestion}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
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
            <p className="text-white/30 text-sm mb-8">
              {Math.round((quizScore / quizQuestions.length) * 100)}% correct
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setQuizIdx(0); setQuizScore(0); setQuizSelected(null); setMode('quiz'); }}
                className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                Retry Quiz
              </button>
              <button
                onClick={() => loadQuiz(true)}
                disabled={quizLoading}
                className="bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} />
                New Quiz
              </button>
              <button
                onClick={() => { setMode('study'); setCurrentIdx(0); setFlipped(false); }}
                className="bg-white/10 hover:bg-white/15 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                Back to Study
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
