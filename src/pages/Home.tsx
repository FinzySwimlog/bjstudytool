import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, BookOpen, Pencil, Check, X } from 'lucide-react';
import { storage } from '../lib/storage';
import type { Subject } from '../types';

const COLORS = [
  'from-violet-600 to-purple-700',
  'from-blue-600 to-cyan-700',
  'from-emerald-600 to-teal-700',
  'from-rose-600 to-pink-700',
  'from-amber-600 to-orange-700',
  'from-indigo-600 to-blue-700',
];

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    setSubjects(storage.getSubjects());
  }, []);

  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  function addSubject() {
    if (!title.trim()) return;
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      title: title.trim(),
      emoji: '',
      color,
      createdAt: Date.now(),
    };
    const updated = [...subjects, newSubject];
    setSubjects(updated);
    storage.saveSubjects(updated);
    setTitle('');
    setColor(COLORS[0]);
    setShowModal(false);
  }

  function deleteSubject(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = subjects.filter((s) => s.id !== id);
    setSubjects(updated);
    storage.saveSubjects(updated);
  }

  function startRename(subject: Subject, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingId(subject.id);
    setRenameValue(subject.title);
  }

  function commitRename(id: string) {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    const updated = subjects.map((s) =>
      s.id === id ? { ...s, title: renameValue.trim() } : s
    );
    setSubjects(updated);
    storage.saveSubjects(updated);
    setRenamingId(null);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">My Subjects</h1>
          <p className="text-white/50 text-sm">{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          Add Subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-24">
          <BookOpen size={48} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 text-lg mb-2">No subjects yet</p>
          <p className="text-white/30 text-sm">Add your first subject to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              onClick={() => renamingId !== subject.id && navigate(`/subject/${subject.id}`)}
              className="group relative cursor-pointer rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className={`bg-gradient-to-r ${subject.color} h-1`} />
              <div className="p-4">
                {renamingId === subject.id ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(subject.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      className="flex-1 bg-white/10 border border-violet-500 rounded-lg px-2.5 py-1 text-white text-sm focus:outline-none"
                    />
                    <button onClick={() => commitRename(subject.id)} className="p-1 text-emerald-400 hover:text-emerald-300">
                      <Check size={15} />
                    </button>
                    <button onClick={() => setRenamingId(null)} className="p-1 text-white/40 hover:text-white">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <h2 className="text-white font-semibold text-base">{subject.title}</h2>
                )}
                <p className="text-white/30 text-xs mt-1">
                  {new Date(subject.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={(e) => startRename(subject, e)}
                  className="p-1.5 rounded-lg bg-[#0f0f13]/60 text-white/40 hover:text-white transition-colors"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={(e) => deleteSubject(subject.id, e)}
                  className="p-1.5 rounded-lg bg-[#0f0f13]/60 text-white/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-semibold text-xl mb-5">New Subject</h2>

            <div className="mb-4">
              <label className="text-white/60 text-sm mb-1.5 block">Subject name</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                placeholder="e.g. Biology, French, History..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            <div className="mb-6">
              <label className="text-white/60 text-sm mb-1.5 block">Pick a color</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${c} transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#1a1a24]' : 'hover:scale-110'}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={addSubject}
                disabled={!title.trim()}
                className="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
              >
                Create Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
