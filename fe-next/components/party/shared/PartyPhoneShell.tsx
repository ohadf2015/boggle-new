'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/**
 * PartyPhoneShell — the single root wrapper every party PHONE controller sits in.
 *
 * Each game's root div was independently getting three mobile fundamentals
 * wrong. This centralizes them:
 *   1. `dir` — mirrors text direction so Hebrew (RTL) lays out correctly.
 *   2. safe-area padding — keeps controls clear of the notch / home indicator
 *      (see the `.pt-safe` / `.pb-safe` / `.px-safe` utilities in globals.css).
 *   3. `min-h-dvh` + flex column — a dynamic-viewport stage that doesn't jump
 *      when the mobile URL bar shows/hides, with children free to use
 *      `flex-1 min-h-0 overflow-y-auto` to scroll INSIDE the shell.
 */

interface PartyPhoneShellProps {
  children: React.ReactNode;
  /** Extra classes. Include a `bg-*` to override the default navy surface. */
  className?: string;
  /**
   * Bound the shell to exactly the viewport height (`h-dvh`) instead of letting
   * it grow (`min-h-dvh`). Use this for screens with a header + a long scrolling
   * list (vote ballots, target pickers): only a bounded ancestor lets a
   * `flex-1 min-h-0 overflow-y-auto` child scroll INTERNALLY so the header
   * stays put. Centered/short screens want the default (grow so nothing clips).
   */
  bounded?: boolean;
}

export function PartyPhoneShell({ children, className = '', bounded = false }: PartyPhoneShellProps) {
  const { dir } = useLanguage();
  const hasBg = /\bbg-/.test(className);

  const classes = [
    bounded ? 'h-dvh' : 'min-h-dvh',
    'flex flex-col pt-safe pb-safe px-safe',
    hasBg ? '' : 'bg-neo-navy',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div dir={dir} className={classes}>
      {children}
    </div>
  );
}

export default PartyPhoneShell;
