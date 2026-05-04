import { useState, useEffect, useCallback } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh]);

  useEffect(() => {
    let startY = 0;
    let triggered = false;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        triggered = false;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (triggered) return;
      const diff = e.changedTouches[0].clientY - startY;
      if (window.scrollY === 0 && diff > 80) {
        triggered = true;
        refresh();
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [refresh]);

  return refreshing;
}
