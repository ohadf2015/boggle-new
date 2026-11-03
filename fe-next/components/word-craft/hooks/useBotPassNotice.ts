import { useEffect, useRef, useState } from 'react';

interface Move { who: 'player' | 'bot'; words: string[] }

const NOTICE_MS = 2400;

export function useBotPassNotice(history: Move[], hotseat: boolean): { key: number } | null {
  const [notice, setNotice] = useState<{ key: number } | null>(null);
  const prevLen = useRef(history.length);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const len = history.length;
    const grew = len > prevLen.current;
    prevLen.current = len;
    const newest = history[len - 1];
    if (hotseat || !grew || !newest || newest.who !== 'bot' || newest.words.length > 0) return;
    if (timer.current) clearTimeout(timer.current);
    setNotice({ key: len });
    timer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, [history, hotseat]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return notice;
}
