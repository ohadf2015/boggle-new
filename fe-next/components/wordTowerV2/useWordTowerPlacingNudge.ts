import { useCallback, useEffect, useRef, useState } from 'react';
import { useExperiment } from '@/hooks/useExperiment';

const SHAKE_MS = 500;

/**
 * Word Tower tray tiles give zero feedback while a word hangs on the hook
 * (`placing`), so players hammer the tray thinking it froze (rage-click
 * signal, 2026-11-12). `exp-wordtower-placing-nudge-v1` makes the DROP
 * button shake once per blocked tap in the `nudge` arm.
 */
export function useWordTowerPlacingNudge() {
  const { variant, trackExposure } = useExperiment('exp-wordtower-placing-nudge-v1');
  const active = variant === 'nudge';
  const [shake, setShake] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) trackExposure();
  }, [active, trackExposure]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const onBlockedTap = useCallback(() => {
    if (!active) return;
    setShake(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShake(false), SHAKE_MS);
  }, [active]);

  return { shake, onBlockedTap };
}
