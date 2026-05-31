'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { FlaskConical, ArrowRight, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { HowToPlayCard } from '@/components/common/HowToPlayCard';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { applyHebrewFinalLetters, HEBREW_FINAL_TO_REGULAR } from '@/shared/utils/wordNormalization';
import AlchemyKeyboard from '@/components/wordAlchemy/AlchemyKeyboard';
import { getKeyboardLetters, appendLetter, backspace } from '@/lib/wordAlchemy/keyboard';
import { getWildcardCatalyst } from '@/lib/wordAlchemy/wildcardCatalyst';
import { WildcardFoundModal } from '@/components/wordAlchemy/WildcardFoundModal';

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

/**
 * Normalize a guess to the canonical answer form, language-agnostically:
 * English letters are uppercased and kept; Hebrew letters are kept as-is (no
 * case) with sofit/final forms folded to their base letter (ם→מ, ן→נ, …) so a
 * player can type either form; everything else (spaces, punctuation, niqqud) is
 * stripped. Curated answers are stored in this same base form.
 */
export function normalizeGuess(input: string): string {
  let out = '';
  for (const ch of input.toUpperCase()) {
    if (ch >= 'A' && ch <= 'Z') out += ch;                       // English A–Z
    else if (HEBREW_FINAL_TO_REGULAR[ch]) out += HEBREW_FINAL_TO_REGULAR[ch]; // sofit → base
    else if (ch >= 'א' && ch <= 'ת') out += ch;        // Hebrew base letters
  }
  return out;
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

/**
 * Hebrew chains for the /he playtest. Stored in BASE-letter form (no sofit) so
 * `normalizeGuess` matches them whether the player types base or final letters;
 * the UI applies sofit only for display. Every op genuinely maps the prior word
 * to the answer (reverse/anagram/add/remove/change — the mechanical ops, which
 * transfer cleanly to Hebrew; synonym/homophone are skipped here since Hebrew
 * phonetics make homophones unreliable). All words verified against the he list.
 */
export const PUZZLES_HE: AlchemyPuzzle[] = [
  {
    id: 'h1',
    start: 'רוח', // wind
    steps: [
      { op: 'reverse', answer: 'חור' },       // hole — רוח reversed
      { op: 'changeLetter', answer: 'חול' },   // sand — ר→ל
    ],
  },
  {
    id: 'h2',
    start: 'ספר', // book
    steps: [
      { op: 'anagram', answer: 'פרס' },        // prize — same letters
      { op: 'addLetter', answer: 'פרסה' },     // hoof — +ה
    ],
  },
  {
    id: 'h3',
    start: 'כלב', // dog
    steps: [
      { op: 'changeLetter', answer: 'כלא' },   // prison — ב→א
      { op: 'changeLetter', answer: 'מלא' },   // full — כ→מ
    ],
  },
  {
    id: 'h4',
    start: 'שמלה', // dress
    steps: [
      { op: 'removeLetter', answer: 'מלה' },   // word — −ש
      { op: 'anagram', answer: 'להמ' },        // "to them" (להם) — same letters
    ],
  },
  {
    id: 'h5',
    start: 'אור', // light
    steps: [
      { op: 'addLetter', answer: 'אורז' },     // rice — +ז
      { op: 'changeLetter', answer: 'אורח' },  // guest — ז→ח
    ],
  },
  {
    id: 'h6',
    start: 'חתול', // cat
    steps: [
      { op: 'removeLetter', answer: 'חול' },   // sand — −ת
      { op: 'reverse', answer: 'לוח' },        // board — חול reversed
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function WordAlchemyPage() {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const { playSound } = useSoundEffects();
  const routeParams = useParams<{ locale: string }>();
  const isHe = (routeParams?.locale ?? 'en') === 'he';
  const puzzles = isHe ? PUZZLES_HE : PUZZLES;
  const dir = isHe ? 'rtl' : 'ltr';
  // Hebrew words are stored base-form; show final (sofit) letters in the UI.
  const display = (w: string) => (isHe ? applyHebrewFinalLetters(w) : w);

  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [input, setInput] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wildcardFound, setWildcardFound] = useState(false);
  // The built-word display (was a text input); kept as a ref for shake + burst.
  const inputRef = useRef<HTMLDivElement>(null);
  const flaskRef = useRef<HTMLSpanElement>(null);
  const keyboardLetters = getKeyboardLetters(isHe ? 'he' : 'en');
  const wonFxFiredRef = useRef(false);

  const puzzle = puzzles[puzzleIdx];
  const won = stepIdx >= puzzle.steps.length;
  const step = won ? null : puzzle.steps[stepIdx];
  // Wildcard catalyst — deterministic per puzzle; ~1/3 of puzzles have one.
  const catalyst = useMemo(() => getWildcardCatalyst(puzzle.id), [puzzle.id]);

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
    setWildcardFound(false);
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

    // Wildcard Catalyst — hidden skip mechanic (~1/3 of puzzles).
    // Typing the catalyst word on the trigger step skips it entirely.
    if (
      catalyst.active &&
      catalyst.wildWord !== null &&
      stepIdx === catalyst.triggerStepIdx &&
      input.toUpperCase().trim() === catalyst.wildWord
    ) {
      setStepIdx((s) => s + 1);
      setInput('');
      setWrongCount(0);
      setStreak((s) => s + 1);
      setWildcardFound(true);
      playSound('wordAccepted');
      burstAt('sparkle-gold', inputRef.current, 24);
      return;
    }

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
  // Dev bypass lets the game be reached locally for /he playtest.
  const isDev = process.env.NODE_ENV === 'development';
  if (!isAdmin && !isDev) {
    return (
      <main className="min-h-[100dvh] bg-neo-navy texture-halftone px-4 py-12 flex items-center justify-center">
        <p className="font-neo-body text-neo-white text-center max-w-sm">
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
      <TopBackLink className="mb-4" />
      <HowToPlayCard
        storageKey="word-alchemy"
        title={t('wordAlchemy.howTo.title')}
        steps={[0, 1, 2].map((i) => t(`wordAlchemy.howTo.steps.${i}`))}
        cta={t('wordAlchemy.howTo.cta')}
        accent="purple"
      />
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
          <p className="font-neo-body text-sm sm:text-base text-neo-white max-w-md mx-auto">
            {t('wordAlchemy.instructions')}
          </p>
          <p className="font-neo-body text-xs text-neo-white">
            {t('wordAlchemy.puzzleProgress', { n: puzzleIdx + 1, total: puzzles.length })}
          </p>
        </header>

        {/* Chain so far — flows with the locale's direction (RTL for Hebrew). */}
        <div
          dir={dir}
          className="flex flex-wrap items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-navy-light p-4 shadow-hard"
        >
          {chain.map((word, i) => (
            <span key={`${word}-${i}`} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-4 w-4 text-neo-purple-light rtl:rotate-180" strokeWidth={3} aria-hidden="true" />}
              <span className="rounded-neo border-2 border-black bg-neo-cyan px-3 py-1.5 font-neo-display font-black text-lg uppercase tracking-wide text-neo-navy shadow-hard-sm">
                {display(word)}
              </span>
            </span>
          ))}
          {!won && (
            <span className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-neo-purple-light rtl:rotate-180" strokeWidth={3} aria-hidden="true" />
              <span className="rounded-neo border-2 border-dashed border-neo-white/40 px-3 py-1.5 font-neo-display font-black text-lg uppercase tracking-[0.3em] text-neo-white">
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
              onClick={() => resetPuzzle((puzzleIdx + 1) % puzzles.length)}
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
              <p className="font-neo-body text-xs uppercase tracking-widest text-neo-white">
                {t('wordAlchemy.stepProgress', { n: stepIdx + 1, total: puzzle.steps.length })}
              </p>
              <p className="font-neo-display font-black text-lg text-neo-white">
                <span dir={dir} className="text-neo-cyan">{display(prevWord)}</span>
                <span className="mx-2 text-neo-white">·</span>
                <span className="text-neo-purple-light">{opLabel}</span>
              </p>
              {clue && <p className="font-neo-body text-sm text-neo-white italic">{clue}</p>}
            </div>

            {/* Built-word display — fed by the on-screen keyboard, no typing. */}
            <div
              ref={inputRef}
              dir={dir}
              aria-label={t('wordAlchemy.inputPlaceholder')}
              aria-live="polite"
              className="flex min-h-[3.5rem] w-full items-center justify-center rounded-neo border-3 border-black bg-neo-cream px-4 py-3 text-center font-neo-display font-black text-2xl uppercase tracking-[0.2em] text-neo-navy shadow-hard"
            >
              {input ? (
                display(input)
              ) : (
                <span className="text-neo-navy/30 normal-case tracking-normal text-base">
                  {t('wordAlchemy.inputPlaceholder')}
                </span>
              )}
            </div>

            {/* On-screen letter keyboard — taps build the word above. */}
            <AlchemyKeyboard
              letters={keyboardLetters}
              dir={dir}
              onLetter={(ch) => setInput((sv) => appendLetter(sv, ch))}
              onBackspace={() => setInput((sv) => backspace(sv))}
              backspaceLabel={t('wordAlchemy.backspace')}
            />

            {showHint && (
              <p className="text-center font-neo-body text-sm text-neo-white">
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
              className="mx-auto flex items-center gap-1.5 font-neo-body text-xs uppercase tracking-wide text-neo-white transition-colors hover:text-neo-white"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              {t('wordAlchemy.restart')}
            </button>
          </form>
        )}
      </div>
      {wildcardFound && <WildcardFoundModal onDismiss={() => setWildcardFound(false)} />}
    </main>
  );
}
