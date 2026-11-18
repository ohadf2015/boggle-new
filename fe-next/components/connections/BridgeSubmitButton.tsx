'use client';

import { CornerDownLeft } from 'lucide-react';

interface BridgeSubmitButtonProps {
  label: string;
  onSubmit: () => void;
  disabled?: boolean;
  /** Every slot is filled: the bar lights lime. */
  ready?: boolean;
  /** Physical Enter is down. */
  pressed?: boolean;
}

const PRESSED = 'translate-x-px translate-y-px shadow-hard-pressed';

/**
 * Full-width "check" bar used under the Word Bridge on-screen keyboard and
 * the IME field. Long, high-contrast, and disabled until there is a guess.
 */
export const BRIDGE_SUBMIT_CLASS = [
  'inline-flex w-full min-h-12 items-center justify-center gap-2',
  '[@media(max-height:800px)]:min-h-11',
  'rounded-neo border-neo-thick border-neo-black px-4',
  'font-neo-display text-lg font-black uppercase leading-none text-neo-navy rtl:normal-case',
  'shadow-hard touch-manipulation select-none',
  'transition-[transform,translate,box-shadow,background-color,opacity] duration-75',
  'active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
  'disabled:cursor-not-allowed disabled:opacity-40',
].join(' ');

export default function BridgeSubmitButton({
  label,
  onSubmit,
  disabled = false,
  ready = false,
  pressed = false,
}: BridgeSubmitButtonProps) {
  return (
    <button
      type="button"
      onClick={onSubmit}
      disabled={disabled}
      aria-label={label}
      title={label}
      data-testid="keyboard-submit"
      data-pressed={pressed || undefined}
      data-ready={(ready && !disabled) || undefined}
      className={`${BRIDGE_SUBMIT_CLASS} ${
        ready && !disabled ? 'bg-neo-lime ring-4 ring-neo-lime/40 active:bg-neo-lime' : 'bg-neo-cyan active:bg-neo-cyan-light'
      } ${pressed ? PRESSED : ''}`}
    >
      <CornerDownLeft className="h-5 w-5 shrink-0" strokeWidth={2.75} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
}
