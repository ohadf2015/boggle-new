'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PolledBoard<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

/**
 * Loads a board while `enabled`, re-polls every `intervalMs` while the page is
 * visible, and pauses when it is hidden. Each load aborts the one before it and
 * a sequence token drops any response that lands after a newer request.
 * Changing `key` (date, language, scope) reloads immediately.
 */
export function usePolledBoard<T>(
  load: (signal: AbortSignal) => Promise<T>,
  { enabled, key, intervalMs = 30_000 }: { enabled: boolean; key: string; intervalMs?: number },
): PolledBoard<T> {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: boolean }>({
    data: null,
    loading: enabled,
    error: false,
  });
  const loadRef = useRef(load);
  loadRef.current = load;
  const seq = useRef(0);
  const inflight = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: false }));
    try {
      const data = await loadRef.current(controller.signal);
      if (id !== seq.current) return;
      setState({ data, loading: false, error: false });
    } catch (err) {
      if (id !== seq.current || controller.signal.aborted) return;
      console.error('Failed to load leaderboard:', err);
      setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(run, intervalMs);
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        run();
        start();
      }
    };

    const requestSeq = seq;
    run();
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      requestSeq.current++;
      inflight.current?.abort();
    };
  }, [enabled, key, intervalMs, run]);

  // A board enabled after mount must read as loading before its first answer, never as empty.
  const loading = state.loading || (enabled && state.data === null && !state.error);
  return { ...state, loading, reload: run };
}
