import { useReducedMotion } from 'framer-motion';

export type ShakeIntensity = 'light' | 'medium' | 'heavy';

const SHAKE_PX: Record<ShakeIntensity, number> = { light: 4, medium: 8, heavy: 12 };

export function useScreenShake(boardRef: React.RefObject<HTMLDivElement>) {
  const prefersReducedMotion = useReducedMotion();

  return (intensity: ShakeIntensity) => {
    if (prefersReducedMotion) return;
    const el = boardRef.current;
    if (!el) return;
    const key = el.getAttribute('data-shake-key') ?? '0';
    el.setAttribute('data-shake-key', String(Number(key) + 1));
  };
}
