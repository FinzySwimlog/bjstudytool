import { createContext, useContext, useState, useEffect, useRef } from 'react';

type TimerState = 'idle' | 'running' | 'paused' | 'finished';

interface TimerCtx {
  state: TimerState;
  remaining: number;
  start: (seconds: number) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  dismiss: () => void;
}

const TimerContext = createContext<TimerCtx | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>('idle');
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTick() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  function tick(onDone: () => void) {
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearTick(); onDone(); return 0; }
        return r - 1;
      });
    }, 1000);
  }

  function start(seconds: number) {
    clearTick();
    setRemaining(seconds);
    setState('running');
    tick(() => setState('finished'));
  }

  function pause() { clearTick(); setState('paused'); }

  function resume() {
    setState('running');
    tick(() => setState('finished'));
  }

  function cancel() { clearTick(); setState('idle'); setRemaining(0); }
  function dismiss() { setState('idle'); setRemaining(0); }

  useEffect(() => () => clearTick(), []);

  return (
    <TimerContext.Provider value={{ state, remaining, start, pause, resume, cancel, dismiss }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
