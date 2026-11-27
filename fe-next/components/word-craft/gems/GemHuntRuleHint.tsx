'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { X, Info } from 'lucide-react';

export interface GemHuntRuleHintProps {
  text: string;
  dismissLabel: string;
  onDismiss: () => void;
  dismissed?: boolean;
}

export function GemHuntRuleHint({ text, dismissLabel, onDismiss, dismissed }: GemHuntRuleHintProps) {
  const chipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dismissed) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!chipRef.current) return;
    gsap.fromTo(
      chipRef.current,
      { scale: 0.85, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.28, ease: 'back.out(1.7)' },
    );
    // Mount-only: this chip unmounts (returns null) once dismissed, so it never re-fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed) return null;
  return (
    <div
      ref={chipRef}
      className="flex items-center gap-1.5 rounded-neo border-2 border-black bg-neo-purple/90 px-2 py-1 shadow-hard-sm shrink-0"
    >
      <Info className="h-3.5 w-3.5 text-neo-white shrink-0" aria-hidden />
      <span className="font-neo-body text-[10px] leading-tight text-neo-white">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        className="ms-auto shrink-0 rounded-full p-0.5 text-neo-white/80 hover:text-neo-white"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
