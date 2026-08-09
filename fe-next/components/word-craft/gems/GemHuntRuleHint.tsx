'use client';

import { X, Info } from 'lucide-react';

export interface GemHuntRuleHintProps {
  text: string;
  dismissLabel: string;
  onDismiss: () => void;
  dismissed?: boolean;
}

export function GemHuntRuleHint({ text, dismissLabel, onDismiss, dismissed }: GemHuntRuleHintProps) {
  if (dismissed) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-neo border-2 border-black bg-neo-purple/90 px-2 py-1 shadow-hard-sm shrink-0">
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
