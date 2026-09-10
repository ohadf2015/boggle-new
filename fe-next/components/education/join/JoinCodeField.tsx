'use client';

import React, { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

export const JOIN_CODE_LENGTH = 6;

/** Uppercase, drop everything that is not a code character, cap at six. */
export function sanitizeJoinCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, JOIN_CODE_LENGTH);
}

interface JoinCodeFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** Accessible name — the visible headline is decorative-large, not a label. */
  label: string;
  describedBy?: string;
  invalid?: boolean;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
}

/**
 * Six enormous cells, driven by ONE real input.
 *
 * Six separate inputs is the usual way to build this and it is a trap on a
 * phone: every mobile keyboard, autofill, and long-press-paste has to be
 * fought per box, and backspace across a boundary is a bug generator. A single
 * transparent input stretched over six painted cells gets paste, IME, hardware
 * keyboards and the software caret for free — the "auto-advance" is simply the
 * highlight following `value.length`, so it can never desynchronise from the
 * value the way focus-juggling does.
 *
 * `dir="ltr"` is pinned on the cell strip, not just the input. A join code is
 * Latin alphanumerics in every one of our six locales, and a flex row inside
 * an RTL page lays its children out right-to-left — which would render the
 * code backwards for a Hebrew student while the value underneath was correct.
 */
export function JoinCodeField({
  value,
  onChange,
  label,
  describedBy,
  invalid = false,
  autoFocus = false,
  onComplete,
}: JoinCodeFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cells = Array.from({ length: JOIN_CODE_LENGTH }, (_, i) => value[i] ?? '');
  const activeIndex = Math.min(value.length, JOIN_CODE_LENGTH - 1);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = sanitizeJoinCode(e.target.value);
      onChange(next);
      // Fires on the sixth character AND on a six-character paste, so the two
      // ways in behave identically (recurring pitfall class 3).
      if (next.length === JOIN_CODE_LENGTH) onComplete?.(next);
    },
    [onChange, onComplete]
  );

  return (
    <div
      // The code itself is direction-neutral data. Pin it.
      dir="ltr"
      className="relative w-full select-none"
    >
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5">
        {cells.map((char, i) => {
          const filled = char !== '';
          const isActive = !invalid && i === activeIndex && value.length < JOIN_CODE_LENGTH;
          return (
            <div
              key={i}
              aria-hidden="true"
              className={cn(
                'flex aspect-[4/5] items-center justify-center rounded-neo border-3 font-neo-display text-3xl font-black leading-none transition-colors duration-100 sm:text-5xl',
                invalid
                  ? 'border-neo-black bg-neo-red/90 text-neo-white shadow-hard'
                  : filled
                    ? 'border-neo-black bg-neo-lime text-neo-navy shadow-hard'
                    : 'border-neo-black bg-neo-navy-light text-neo-white/30 shadow-hard-sm',
                isActive && 'bg-neo-cyan text-neo-navy shadow-hard'
              )}
            >
              {filled ? (
                <span className="animate-neo-pop">{char}</span>
              ) : isActive ? (
                <span className="h-7 w-1.5 rounded-full bg-neo-navy animate-pulse sm:h-10" />
              ) : null}
            </div>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        maxLength={JOIN_CODE_LENGTH}
        inputMode="text"
        enterKeyHint="next"
        // `one-time-code` would summon the iOS SMS-autofill bar over a code that
        // never arrives by SMS.
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        autoFocus={autoFocus}
        data-testid="join-code-input"
        // Transparent, but a real focusable input covering the whole strip: the
        // software keyboard, the caret and long-press-paste all belong to it.
        className="absolute inset-0 h-full w-full cursor-pointer bg-transparent text-center font-neo-display text-3xl tracking-[0.6em] text-transparent caret-transparent outline-none focus-visible:outline-none"
      />
    </div>
  );
}

export default JoinCodeField;
