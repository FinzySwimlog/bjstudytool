import { useState, useRef, useEffect } from 'react';
import { Timer, Play, Pause, X } from 'lucide-react';
import { useTimer } from '../lib/timerContext';

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TimerWidget() {
  const { state, remaining, start, pause, resume, cancel, dismiss } = useTimer();
  const [open, setOpen] = useState(false);
  const [customMin, setCustomMin] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === 'finished') setOpen(false);
  }, [state]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const pillCls = state === 'running'
    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40';

  return (
    <>
      <div ref={ref} className="relative">
        {state === 'idle' ? (
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all text-xs"
          >
            <Timer size={13} />
            <span className="hidden sm:inline">Timer</span>
          </button>
        ) : (
          <button
            onClick={() => setOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold transition-all ${pillCls}`}
          >
            {state === 'paused' && <Pause size={10} className="fill-current shrink-0" />}
            {fmt(remaining)}
          </button>
        )}

        {open && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl z-50 w-56 p-4">
            {state === 'idle' ? (
              <>
                <p className="text-white/40 text-xs mb-3 text-center font-medium tracking-wide uppercase">Start timer</p>
                <button
                  onClick={() => { start(10 * 60); setOpen(false); }}
                  className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium mb-2.5 transition-colors"
                >
                  10 minutes
                </button>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customMin}
                    onChange={(e) => setCustomMin(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const m = parseInt(customMin);
                        if (m > 0) { start(m * 60); setOpen(false); setCustomMin(''); }
                      }
                    }}
                    placeholder="Custom (min)"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  <button
                    onClick={() => {
                      const m = parseInt(customMin);
                      if (m > 0) { start(m * 60); setOpen(false); setCustomMin(''); }
                    }}
                    disabled={!customMin || parseInt(customMin) <= 0}
                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white transition-colors"
                  >
                    <Play size={14} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className={`text-center font-mono text-4xl font-bold mb-1 tracking-tight ${state === 'paused' ? 'text-amber-300' : 'text-white'}`}>
                  {fmt(remaining)}
                </p>
                <p className="text-center text-white/30 text-xs mb-4">
                  {state === 'paused' ? 'Paused' : 'Running'}
                </p>
                <div className="flex gap-2">
                  {state === 'running' ? (
                    <button
                      onClick={() => { pause(); setOpen(false); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
                    >
                      <Pause size={14} /> Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => { resume(); setOpen(false); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
                    >
                      <Play size={14} /> Resume
                    </button>
                  )}
                  <button
                    onClick={() => { cancel(); setOpen(false); }}
                    className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                    title="Cancel timer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {state === 'finished' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[#1a1a24] border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center">
            <div className="text-5xl mb-4">⏰</div>
            <h2 className="text-white text-2xl font-bold mb-2">Time's up!</h2>
            <p className="text-white/50 text-sm mb-6">Your study session has ended.</p>
            <div className="flex gap-3">
              <button
                onClick={dismiss}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white transition-all text-sm"
              >
                Dismiss
              </button>
              <button
                onClick={() => { dismiss(); setTimeout(() => setOpen(true), 50); }}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors"
              >
                Start another
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
