import { useCallback, useEffect, useRef, useState } from 'react';
import { useExperiment } from '@/hooks/useExperiment';

const SHAKE_MS = 500;

export function useWordTowerPlacingNudge(): { onBlockedTap?: () => void; shake?: boolean } {
  const { variant } = useExperiment('exp-wordtower-placing-nudge-v1');
  const [shake, setShake] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onBlockedTap = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setShake(true);
    timer.current = setTimeout(() => setShake(false), SHAKE_MS);
  }, []);

  return variant === 'nudge' ? { onBlockedTap, shake } : {};
}
