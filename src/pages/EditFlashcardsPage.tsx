import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Check, X, Zap, Pencil } from 'lucide-react';
import { storage } from '../lib/storage';
import { generateFlashcards } from '../lib/ai';
import type { FlashcardSet, Flashcard } from '../types';

export default function EditFlashcardsPage() {
  const { id, setId } = useParams<{ id: string; setId: string }>();
  const navigate = useNavigate();

  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTerm, setEditTerm] = useState('');
  const [editDef, setEditDef] = useState('');

  // Add card manually
  const [showAddCard, setShowAddCard] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newDef, setNewDef] = useState('');

  // Add via AI
  const [showAI, setShowAI] = useState(false);
  const [aiContent, setAIContent] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState('');

  useEffect(() => {
    const found = storage.getFlashcardSets().find((s) => s.id === setId);
    if (!found) { navigate(`/subject/${id}`); return; }
    setSet(found);
  }, [setId, id, navigate]);

  function persist(updated: FlashcardSet) {
    setSet(updated);
    storage.saveFlashcardSets(
      storage.getFlashcardSets().map((s) => (s.id === setId ? updated : s))
    );
  }

  function startEdit(card: Flashcard) {
    setEditingId(card.id);
    setEditTerm(card.term);
    setEditDef(card.definition);
  }

  function saveEdit() {
    if (!set || !editingId) return;
    persist({
      ...set,
      cards: set.cards.map((c) =>
        c.id === editingId ? { ...c, term: editTerm.trim(), definition: editDef.trim() } : c
      ),
    });
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function deleteCard(cardId: string) {
    if (!set) return;
    persist({ ...set, cards: set.cards.filter((c) => c.id !== cardId) });
    if (editingId === cardId) setEditingId(null);
  }

  function addCardManually() {
    if (!set || !newTerm.trim() || !newDef.trim()) return;
    const card: Flashcard = {
      id: crypto.randomUUID(),
      term: newTerm.trim(),
      definition: newDef.trim(),
      tricky: false,
    };
    persist({ ...set, cards: [...set.cards, card] });
    setNewTerm('');
    setNewDef('');
    setShowAddCard(false);
  }

  async function addViaAI() {
    if (!set || !aiContent.trim()) return;
    setAILoading(true);
    setAIError('');
    try {
      const newCards = await generateFlashcards(aiContent);
      persist({ ...set, cards: [...set.cards, ...newCards] });
      setAIContent('');
      setShowAI(false);
    } catch (e) {
      setAIError(e instanceof Error ? e.message : 'Failed to generate cards');
    } finally {
      setAILoading(false);
    }
  }

  if (!set) return null;

  const filtered = set.cards.filter(
    (c) =>
      search === '' ||
      c.term.toLowerCase().includes(search.toLowerCase()) ||
      c.definition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button
            onClick={() => navigate(`/subject/${id}/flashcards/${setId}`)}
            className="text-white/40 hover:text-white text-sm mb-2 transition-colors"
          >
            ← Back to study
          </button>
          <h1 className="text-2xl font-bold text-white">{set.title}</h1>
          <p className="text-white/40 text-sm mt-0.5">{set.cards.length} cards total</p>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => { setShowAI(true); setShowAddCard(false); }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Zap size={15} />
            Add via AI
          </button>
          <button
            onClick={() => { setShowAddCard(true); setShowAI(false); }}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Add Card
          </button>
        </div>
      </div>

      {/* Add card manually */}
      {showAddCard && (
        <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-5 mb-5">
          <h3 className="text-white font-medium mb-4">Add a card</h3>
          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-white/50 text-xs mb-1 block">Term</label>
              <input
                autoFocus
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Term or concept"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">Definition</label>
              <input
                value={newDef}
                onChange={(e) => setNewDef(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCardManually()}
                placeholder="Definition or explanation"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddCard(false)}
              className="px-4 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white text-sm transition-all"
            >
              Cancel
            </button>
            <button
              onClick={addCardManually}
              disabled={!newTerm.trim() || !newDef.trim()}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
              Add Card
            </button>
          </div>
        </div>
      )}

      {/* Add via AI */}
      {showAI && (
        <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-5 mb-5">
          <h3 className="text-white font-medium mb-1">Add more cards via AI</h3>
          <p className="text-white/40 text-sm mb-4">Paste additional content and AI will generate new cards to append to this set.</p>
          <textarea
            autoFocus
            value={aiContent}
            onChange={(e) => setAIContent(e.target.value)}
            placeholder="Paste more notes, definitions, textbook content..."
            rows={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors mb-3"
          />
          {aiError && <p className="text-red-400 text-sm mb-3">{aiError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAI(false); setAIError(''); }}
              className="px-4 py-2 rounded-lg border border-white/10 text-white/50 hover:text-white text-sm transition-all"
            >
              Cancel
            </button>
            <button
              onClick={addViaAI}
              disabled={aiLoading || !aiContent.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
              <Zap size={14} />
              {aiLoading ? 'Generating...' : 'Generate & Append'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-violet-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {search && (
        <p className="text-white/40 text-sm mb-4">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"</p>
      )}

      {/* Card list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-white/30 py-12">No cards match your search.</p>
        )}
        {filtered.map((card) => (
          <div
            key={card.id}
            className="group bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden"
          >
            {editingId === card.id ? (
              /* Edit form */
              <div className="p-4">
                <div className="grid md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-white/50 text-xs mb-1 block">Term</label>
                    <input
                      autoFocus
                      value={editTerm}
                      onChange={(e) => setEditTerm(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-white/50 text-xs mb-1 block">Definition</label>
                    <textarea
                      value={editDef}
                      onChange={(e) => setEditDef(e.target.value)}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white text-sm transition-all"
                  >
                    <X size={13} /> Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={!editTerm.trim() || !editDef.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                  >
                    <Check size={13} /> Save
                  </button>
                </div>
              </div>
            ) : (
              /* Display row */
              <div className="flex items-start gap-4 p-4">
                <div className="flex-1 grid md:grid-cols-2 gap-2 min-w-0">
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">Term</p>
                    <p className="text-white text-sm font-medium leading-snug">{card.term}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">Definition</p>
                    <p className="text-white/80 text-sm leading-snug">{card.definition}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(card)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteCard(card.id)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
