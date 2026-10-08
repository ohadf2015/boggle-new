'use client';

import { useEffect, useId, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { sanitizeGameCode } from '@/lib/multiplayer/sanitizeGameCode';
import { cn } from '@/lib/utils';
import { useEntrySfx } from './useEntrySfx';

/** Room codes are six characters (generateGameCode). */
export const CODE_LENGTH = 6;

const EMPTY = Array.from({ length: CODE_LENGTH }, () => '');
const clean = (raw: string) => sanitizeGameCode(raw).toUpperCase();

interface CodeEntryProps {
  onSubmit: (code: string) => void;
  /** A join is in flight: boxes lock; when it ends while still mounted, it failed. */
  busy?: boolean;
  className?: string;
}

/**
 * JOIN BY CODE (DESIGN §b.1): six boxes that auto-advance, accept a paste, and
 * submit on the sixth character. A pasted code LONGER than six (the server
 * accepts up to ten) is submitted whole — never cut to six and fired. If the
 * join fails (busy ends and we are still on the entry), the boxes shake, clear
 * and refocus the first.
 */
export function CodeEntry({ onSubmit, busy = false, className }: CodeEntryProps) {
  const { t } = useLanguage();
  const sfx = useEntrySfx();
  const [chars, setChars] = useState<string[]>(EMPTY);
  const [shake, setShake] = useState(0);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const hintId = useId();
  const wasBusy = useRef(false);
  /** Only a join THIS row submitted can fail here — quick play or a sheet's join must not clear it. */
  const submitted = useRef(false);

  const submit = (code: string) => {
    submitted.current = true;
    onSubmit(code);
  };

  useEffect(() => {
    if (busy) {
      wasBusy.current = true;
      return;
    }
    if (!wasBusy.current) return;
    wasBusy.current = false;
    if (!submitted.current) return;
    submitted.current = false;
    setChars(EMPTY);
    setShake((s) => s + 1);
  }, [busy]);

  // After a failed join the row re-mounts (to replay the shake) — focus the new
  // first box, unless the player is working in a dialog (a sheet over the entry).
  useEffect(() => {
    if (shake === 0) return;
    if (document.activeElement?.closest?.('[role="dialog"]')) return;
    if (window.matchMedia?.('(pointer: coarse)').matches) return;
    refs.current[0]?.focus();
  }, [shake]);

  const focus = (i: number) => refs.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))]?.focus();

  const fill = (start: number, text: string) => {
    const next = [...chars];
    let i = start;
    for (const ch of text) {
      if (i >= CODE_LENGTH) break;
      next[i] = ch;
      i += 1;
    }
    setChars(next);
    const code = next.join('');
    if (code.length === CODE_LENGTH && next.every(Boolean)) {
      sfx.lock();
      submit(code);
      refs.current[CODE_LENGTH - 1]?.blur();
      return;
    }
    sfx.tick();
    focus(i);
  };

  const onChange = (i: number, value: string) => {
    if (value === '') {
      setChars((c) => c.map((ch, j) => (j === i ? '' : ch)));
      return;
    }
    const cleaned = clean(value);
    if (!cleaned) return;
    // maxLength 2: typing over a filled box yields "AB" — the newest char wins.
    fill(i, cleaned.slice(-1));
  };

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const code = clean(e.clipboardData.getData('text'));
    if (!code) return;
    if (code.length > CODE_LENGTH) {
      setChars(code.slice(0, CODE_LENGTH).split(''));
      sfx.lock();
      submit(code);
      return;
    }
    fill(i === 0 || code.length === CODE_LENGTH ? 0 : i, code);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[i]) {
      e.preventDefault();
      const prev = Math.max(0, i - 1);
      setChars((c) => c.map((ch, j) => (j === prev ? '' : ch)));
      focus(prev);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
      const forward = (e.key === 'ArrowRight') !== rtl;
      focus(i + (forward ? 1 : -1));
    }
  };

  return (
    <div className={cn('rounded-neo-lg border-3 border-neo-black bg-neo-navy-light p-3 lg:p-4 tv:p-6 shadow-hard', className)}>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] tv:text-base font-bold uppercase tracking-[0.15em] text-neo-pink">
        <KeyRound aria-hidden="true" className="h-3.5 w-3.5" />
        {t('mpUi.entry.codeLabel')}
        {busy && <Loader2 aria-hidden="true" className="ms-auto h-4 w-4 animate-spin text-neo-white" />}
      </p>
      {/* Codes are Latin alphanumerics: the row stays LTR in every locale. */}
      <div key={shake} dir="ltr" className={cn('grid grid-cols-6 gap-1.5 sm:gap-2', shake > 0 && 'motion-safe:animate-neo-shake')}>
        {chars.map((ch, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={ch}
            onChange={(e) => onChange(i, e.target.value)}
            onPaste={(e) => onPaste(i, e)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.currentTarget.select()}
            disabled={busy}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={2}
            aria-label={t('mpUi.entry.codeAria', { n: i + 1, total: CODE_LENGTH })}
            aria-describedby={hintId}
            className={cn(
              'h-12 lg:h-14 tv:h-20 w-full min-w-0 rounded-neo border-3 border-neo-black text-center font-neo-display! text-2xl! tv:text-4xl! font-bold uppercase outline-hidden transition-transform duration-100',
              'focus:-translate-y-0.5 focus:border-neo-lime focus:shadow-hard-sm disabled:opacity-60',
              // A filled box pops once as its character lands (the class arrives with the character).
              ch ? 'bg-neo-lime text-neo-black animate-mp-bump' : 'bg-neo-navy text-neo-white',
            )}
          />
        ))}
      </div>
      <p id={hintId} className="mt-2 text-xs tv:text-base font-bold text-neo-white/70">{t('mpUi.entry.codeHint')}</p>
    </div>
  );
}
