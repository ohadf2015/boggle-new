'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FlaskConical, ArrowRight, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';

/**
 * Word Alchemy — an experimental, admin-gated transformation-chain mode
 * (Parseword-lite, with Parseword's hidden-operation frustration removed:
 * every step's operation is shown as a label up front).
 *
 * The discovery surface is gated, not the route: the hub tile in
 * `LandingChallengeCards` only renders for admins. The page itself is plain
 * — anyone who types the URL gets the game. No sitemap / llms.txt / nav link.
 *
 * Puzzles ship their own answer chains, so validation is exact-match against
 * the known next word — no dictionary lookup, no server round-trip. The whole
 * loop runs offline in the browser.
 */

// ─── Pure game logic (exported for unit tests) ──────────────────────────────

export const ALCHEMY_OPS = [
  'synonym',
  'anagram',
  'reverse',
  'addLetter',
  'removeLetter',
  'changeLetter',
  'homophone',
] as const;

export type AlchemyOp = (typeof ALCHEMY_OPS)[number];

export interface AlchemyStep {
  op: AlchemyOp;
  /** The word this step produces (uppercase, letters only). */
  answer: string;
  /** Optional clue translation key — used for ambiguous ops (synonym/homophone). */
  clueKey?: string;
}

export interface AlchemyPuzzle {
  id: string;
  start: string;
  steps: AlchemyStep[];
}

/** Uppercase + strip everything that isn't an A–Z letter. */
export function normalizeGuess(input: string): string {
  return input.toUpperCase().replace(/[^A-Z]/g, '');
}

/** Exact-match a player's guess against a step's curated answer. */
export function checkGuess(guess: string, answer: string): boolean {
  const g = normalizeGuess(guess);
  return g.length > 0 && g === normalizeGuess(answer);
}

/**
 * Progressive letter reveal. The more wrong attempts, the more letters show —
 * but the top tier still hides the middle letter so the answer is never fully
 * given away. Returns a space-joined mask, e.g. `'B _ _ R'`.
 */
export function revealHint(answer: string, wrongCount: number): string {
  const letters = answer.toUpperCase().split('');
  const n = letters.length;
  const tier = wrongCount < 2 ? 0 : wrongCount < 4 ? 1 : wrongCount < 6 ? 2 : 3;
  const revealed = new Set<number>();
  if (tier >= 1) revealed.add(0);
  if (tier >= 2) revealed.add(n - 1);
  if (tier >= 3) {
    const mid = Math.floor(n / 2);
    for (let i = 0; i < n; i++) if (i !== mid) revealed.add(i);
  }
  return letters.map((ch, i) => (revealed.has(i) ? ch : '_')).join(' ');
}

/**
 * Hand-authored chains for the admin pilot. English-only content (the chrome
 * is localized via `t()`); each labelled op genuinely maps the prior word to
 * the answer, so the moves are fair once you know the operation.
 */
export const PUZZLES: AlchemyPuzzle[] = [
  {
    id: 'p1',
    start: 'STAR',
    steps: [
      { op: 'reverse', answer: 'RATS' },
      { op: 'anagram', answer: 'ARTS' },
    ],
  },
  {
    id: 'p2',
    start: 'FLOUR',
    steps: [
      { op: 'homophone', answer: 'FLOWER', clueKey: 'wordAlchemy.clues.p2s1' },
      { op: 'removeLetter', answer: 'LOWER' },
    ],
  },
  {
    id: 'p3',
    start: 'CAT',
    steps: [
      { op: 'addLetter', answer: 'COAT' },
      { op: 'changeLetter', answer: 'GOAT' },
    ],
  },
  {
    id: 'p4',
    start: 'NIGHT',
    steps: [
      { op: 'anagram', answer: 'THING' },
      { op: 'changeLetter', answer: 'THINK' },
    ],
  },
  {
    id: 'p5',
    start: 'FAST',
    steps: [
      { op: 'synonym', answer: 'QUICK', clueKey: 'wordAlchemy.clues.p5s1' },
      { op: 'changeLetter', answer: 'QUACK' },
    ],
  },
  {
    id: 'p6',
    start: 'SUN',
    steps: [
      { op: 'homophone', answer: 'SON', clueKey: 'wordAlchemy.clues.p6s1' },
      { op: 'addLetter', answer: 'SONG' },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function WordAlchemyPage() {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const { playSound } = useSoundEffects();

  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [input, setInput] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const flaskRef = useRef<HTMLSpanElement>(null);
  const wonFxFiredRef = useRef(false);

  const puzzle = PUZZLES[puzzleIdx];
  const won = stepIdx >= puzzle.steps.length;
  const step = won ? null : puzzle.steps[stepIdx];

  const chain = useMemo(
    () => [puzzle.start, ...puzzle.steps.slice(0, stepIdx).map((s) => s.answer)],
    [puzzle, stepIdx]
  );
  const prevWord = chain[chain.length - 1];

  // Win ceremony — fires once per puzzle. Stacks fanfare + big burst at flask.
  useEffect(() => {
    if (!won || wonFxFiredRef.current) return;
    wonFxFiredRef.current = true;
    playSound('victoryFanfare');
    const rect = flaskRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 3;
    SharedFxApp.spawnBurst('victory-burst', x, y);
    SharedFxApp.spawnBurst('sparkle-gold', x, y, { count: 24 });
  }, [won, playSound]);

  const resetPuzzle = (idx: number) => {
    setPuzzleIdx(idx);
    setStepIdx(0);
    setInput('');
    setWrongCount(0);
    setStreak(0);
    wonFxFiredRef.current = false;
  };

  const burstAt = (preset: string, fallbackEl: HTMLElement | null, extraCount?: number) => {
    const rect = fallbackEl?.getBoundingClientRect();
    if (!rect) return;
    SharedFxApp.spawnBurst(preset, rect.left + rect.width / 2, rect.top + rect.height / 2, extraCount ? { count: extraCount } : undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step) return;
    if (checkGuess(input, step.answer)) {
      setStepIdx((s) => s + 1);
      setInput('');
      setWrongCount(0);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      playSound('wordAccepted');
      // Tiered burst: bigger preset at 3+ streak.
      burstAt(nextStreak >= 3 ? 'celebration' : 'sparkle-valid', inputRef.current, nextStreak >= 3 ? 18 : undefined);
    } else {
      setWrongCount((w) => w + 1);
      setStreak(0);
      playSound('wordRejected');
      burstAt('sparkle-invalid', inputRef.current, 8);
      const el = inputRef.current;
      const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (el && !reduce) {
        el.classList.remove('animate-neo-shake');
        void el.offsetWidth;
        el.classList.add('animate-neo-shake');
      }
    }
  };

  // Admin gate — Word Alchemy stays an admin-only preview per project scope.
  // Render after hooks so order is stable across admin/non-admin renders.
  if (!isAdmin) {
    return (
      <main className="min-h-[100dvh] bg-neo-navy texture-halftone px-4 py-12 flex items-center justify-center">
        <p className="font-neo-body text-neo-white/60 text-center max-w-sm">
          {t('wordAlchemy.adminOnly')}
        </p>
      </main>
    );
  }

  const opLabel = step ? t(`wordAlchemy.ops.${step.op}`) : '';
  const clue = step?.clueKey ? t(step.clueKey) : '';
  const showHint = wrongCount >= 2 && step;

  return (
    <main className="min-h-[100dvh] bg-neo-navy texture-halftone px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6 animate-[fadeInUp_0.4s_ease-out_both] motion-reduce:animate-none">
        {/* Header */}
        <header className="text-center space-y-3">
          <span
            ref={flaskRef}
            className="inline-flex items-center gap-2 rounded-neo border-2 border-black bg-neo-purple px-3 py-1 font-neo-display font-black text-xs uppercase tracking-wide text-neo-navy shadow-hard-sm"
          >
            <FlaskConical className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            {t('wordAlchemy.badge')}
          </span>
          {streak >= 2 && (
            <span className="inline-flex items-center gap-1 rounded-neo border-2 border-black bg-neo-yellow px-2.5 py-0.5 font-neo-display font-black text-[10px] uppercase tracking-wide text-neo-navy shadow-hard-sm animate-neo-pop">
              {t('wordAlchemy.streak', { n: streak })}
            </span>
          )}
          <h1 className="font-neo-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-neo-white">
            {t('wordAlchemy.title')}
          </h1>
          <p className="font-neo-body text-sm sm:text-base text-neo-white/70 max-w-md mx-auto">
            {t('wordAlchemy.instructions')}
          </p>
          <p className="font-neo-body text-xs text-neo-white/50">
            {t('wordAlchemy.puzzleProgress', { n: puzzleIdx + 1, total: PUZZLES.length })}
          </p>
        </header>

        {/* Chain so far — word tokens stay LTR even in Hebrew */}
        <div
          dir="ltr"
          className="flex flex-wrap items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-navy-light p-4 shadow-hard"
        >
          {chain.map((word, i) => (
            <span key={`${word}-${i}`} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-4 w-4 text-neo-purple-light" strokeWidth={3} aria-hidden="true" />}
              <span className="rounded-neo border-2 border-black bg-neo-cyan px-3 py-1.5 font-neo-display font-black text-lg uppercase tracking-wide text-neo-navy shadow-hard-sm">
                {word}
              </span>
            </span>
          ))}
          {!won && (
            <span className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-neo-purple-light" strokeWidth={3} aria-hidden="true" />
              <span className="rounded-neo border-2 border-dashed border-neo-white/40 px-3 py-1.5 font-neo-display font-black text-lg uppercase tracking-[0.3em] text-neo-white/40">
                {showHint ? revealHint(step!.answer, wrongCount) : '?'}
              </span>
            </span>
          )}
        </div>

        {won ? (
          /* Win card */
          <div className="rounded-neo border-3 border-black bg-neo-lime p-6 text-center shadow-hard-lg space-y-4">
            <h2 className="font-neo-display font-black text-2xl uppercase text-neo-navy">
              {t('wordAlchemy.wonTitle')}
            </h2>
            <p className="font-neo-body text-sm text-neo-navy/80">{t('wordAlchemy.wonSubtitle')}</p>
            <button
              type="button"
              onClick={() => resetPuzzle((puzzleIdx + 1) % PUZZLES.length)}
              className="inline-flex items-center gap-2 rounded-neo border-3 border-black bg-neo-purple px-6 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:animate-neo-press motion-reduce:active:animate-none"
            >
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
              {t('wordAlchemy.next')}
            </button>
          </div>
        ) : (
          /* Active step */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-neo border-3 border-black bg-neo-navy-light p-5 shadow-hard space-y-2">
              <p className="font-neo-body text-xs uppercase tracking-widest text-neo-white/50">
                {t('wordAlchemy.stepProgress', { n: stepIdx + 1, total: puzzle.steps.length })}
              </p>
              <p className="font-neo-display font-black text-lg text-neo-white">
                <span dir="ltr" className="text-neo-cyan">{prevWord}</span>
                <span className="mx-2 text-neo-white/60">·</span>
                <span className="text-neo-purple-light">{opLabel}</span>
              </p>
              {clue && <p className="font-neo-body text-sm text-neo-white/60 italic">{clue}</p>}
            </div>

            <input
              ref={inputRef}
              type="text"
              dir="ltr"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              aria-label={t('wordAlchemy.inputPlaceholder')}
              placeholder={t('wordAlchemy.inputPlaceholder')}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-full rounded-neo border-3 border-black bg-neo-cream px-4 py-3 text-center font-neo-display font-black text-2xl uppercase tracking-[0.2em] text-neo-navy shadow-hard outline-none focus:border-neo-purple"
            />

            {showHint && (
              <p className="text-center font-neo-body text-sm text-neo-white/60">
                {t('wordAlchemy.hintLabel')}{' '}
                <span dir="ltr" className="font-neo-display font-black tracking-[0.3em] text-neo-white">
                  {revealHint(step!.answer, wrongCount)}
                </span>
              </p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-purple px-6 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:animate-neo-press motion-reduce:active:animate-none"
            >
              {t('wordAlchemy.submit')}
            </button>

            <button
              type="button"
              onClick={() => resetPuzzle(puzzleIdx)}
              className="mx-auto flex items-center gap-1.5 font-neo-body text-xs uppercase tracking-wide text-neo-white/50 transition-colors hover:text-neo-white"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              {t('wordAlchemy.restart')}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
