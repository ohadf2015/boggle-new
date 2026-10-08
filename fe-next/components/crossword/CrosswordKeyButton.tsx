'use client';

import type { ReactNode } from 'react';
import { Delete } from 'lucide-react';

const KEY_BASE =
  'border-neo border-black rounded-neo shadow-hard active:translate-y-[1px] active:shadow-hard-pressed disabled:opacity-40';

export function LetterKey({ ch, onPress, disabled, className = 'h-11' }: { ch: string; onPress: (ch: string) => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPress(ch)}
      className={`flex-1 max-w-[2.4rem] ${className} bg-neo-white text-neo-navy font-neo-display font-bold uppercase ${KEY_BASE}`}
    >
      {ch}
    </button>
  );
}

export function ActionKey({
  label, onPress, disabled, pressed, children, className = 'h-11 px-3 min-w-[2.75rem]',
}: { label: string; onPress: () => void; disabled?: boolean; pressed?: boolean; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onPress}
      className={`flex items-center justify-center ${className} bg-neo-navy-light text-neo-white font-neo-display font-bold ${KEY_BASE}`}
    >
      {children}
    </button>
  );
}

export function BackspaceKey({ label, onPress, disabled, className }: { label: string; onPress: () => void; disabled?: boolean; className?: string }) {
  return (
    <ActionKey label={label} onPress={onPress} disabled={disabled} className={className}>
      <Delete size={18} />
    </ActionKey>
  );
}
