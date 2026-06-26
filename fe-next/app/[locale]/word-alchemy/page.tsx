'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { FlaskConical, ArrowRight, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { GameStage } from '@/components/game/GameStage';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import { ModeCoach } from '@/components/tutorial/ModeCoach';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { applyHebrewFinalLetters } from "@/shared/utils/wordNormalization";
import AlchemyKeyboard from '@/components/wordAlchemy/AlchemyKeyboard';
import { getKeyboardLetters, appendLetter, backspace } from '@/lib/wordAlchemy/keyboard';
import { alchemyDirHint } from '@/lib/wordAlchemy/dirHint';
import { getWildcardCatalyst } from '@/lib/wordAlchemy/wildcardCatalyst';
import { WildcardFoundModal } from '@/components/wordAlchemy/WildcardFoundModal';
import { useAlchemyHeatMeter } from '@/hooks/useAlchemyHeatMeter';
import { AlchemyHeatBar } from '@/components/wordAlchemy/AlchemyHeatBar';
import { AlchemyShareCard } from '@/components/wordAlchemy/AlchemyShareCard';
import { type StepResult } from '@/lib/wordAlchemy/alchemyShare';
import { SoloRewardCard } from '@/components/solo/SoloRewardCard';
import {
  awardSoloDaily,
  getSoloDateISO,
  isSoloDailyClaimed,
  pickDailyModifier,
} from '@/lib/solo/soloDaily';
import { alchemyScore } from '@/lib/solo/soloReward';
import toast from 'react-hot-toast';
import { checkAndUpdatePB, getAlchemyStreakPB } from '@/lib/wordAlchemy/alchemyStreak';

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


// Pure logic + puzzles moved to ./engine (page files may only export Next fields).
import {
  ALCHEMY_OPS,
  normalizeGuess,
  checkGuess,
  revealHint,
  PUZZLES,
  PUZZLES_HE,
  type AlchemyOp,
  type AlchemyStep,
  type AlchemyPuzzle,
} from "./engine";


// ─── Component ──────────────────────────────────────────────────────────────

export default function WordAlchemyPage() {
  const { t } = useLanguage();
  const { canSeeInWorkModes } = useAuth();
  const { playSound } = useSoundEffects();
  const routeParams = useParams<{ locale: string }>();
  const locale = routeParams?.locale ?? 'en';
  const isHe = locale === 'he';
  const puzzles = isHe ? PUZZLES_HE : PUZZLES;
  const dir = isHe ? 'rtl' : 'ltr';
  // Hebrew words are stored base-form; show final (sofit) letters in the UI.
  const display = (w: string) => (isHe ? applyHebrewFinalLetters(w) : w);

  // Full-screen game: hide global header / bottom-nav / footer so the play
  // surface owns the viewport (and surfaces the in-game mute FAB).
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const { heat, maxHeat, onCorrectGuess, onWrongGuess, reset: resetHeat } = useAlchemyHeatMeter();

  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [input, setInput] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [hintDir, setHintDir] = useState<'↑' | '↓' | null>(null);
  const [streak, setStreak] = useState(0);
  const [pbStreak, setPbStreak] = useState(() => getAlchemyStreakPB());
  const [wildcardFound, setWildcardFound] = useState(false);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [winFlash, setWinFlash] = useState(0);
  // The built-word display (was a text input); kept as a ref for shake + burst.
  const inputRef = useRef<HTMLDivElement>(null);
  const flaskRef = useRef<HTMLSpanElement>(null);
  const keyboardLetters = getKeyboardLetters(isHe ? 'he' : 'en');
  const wonFxFiredRef = useRef(false);

  // Solo Daily layer: shared per-day modifier + once-per-day coin award.
  const today = useMemo(() => getSoloDateISO(), []);
  const dailyModifier = useMemo(() => pickDailyModifier('word-alchemy', today), [today]);
  const [soloAward, setSoloAward] = useState<{ awarded: number; bonus: number; claimed: boolean } | null>(null);

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
    setWinFlash((f) => f + 1);
    const rect = flaskRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 3;
    SharedFxApp.spawnBurst('victory-burst', x, y);
    SharedFxApp.spawnBurst('sparkle-gold', x, y, { count: 24 });

    // Once-per-day coin award; heat → synthesized score. Replays = practice.
    const claimedBefore = isSoloDailyClaimed('word-alchemy', today, locale);
    const res = awardSoloDaily('word-alchemy', today, locale, alchemyScore(heat, maxHeat, true), true);
    setSoloAward(
      res
        ? { awarded: res.awarded, bonus: res.bonus, claimed: false }
        : { awarded: 0, bonus: 0, claimed: claimedBefore },
    );
  }, [won, playSound, today, locale, heat, maxHeat]);

  const resetPuzzle = (idx: number) => {
    setPuzzleIdx(idx);
    setStepIdx(0);
    setInput('');
    setWrongCount(0);
    setStreak(0);
    setHintDir(null);
    setWildcardFound(false);
    setStepResults([]);
    wonFxFiredRef.current = false;
    setSoloAward(null);
    resetHeat();
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
      setStepResults((p) => [...p, { wild: true, attempts: 0 }]);
      setWildcardFound(true);
      playSound('wordAccepted');
      burstAt('sparkle-gold', inputRef.current, 24);
      return;
    }

    if (checkGuess(input, step.answer)) {
      setStepIdx((s) => s + 1);
      setInput('');
      const { wasRush } = onCorrectGuess(wrongCount === 0);
      setStepResults((p) => [...p, { wild: false, attempts: wrongCount }]);
      setWrongCount(0);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const { isNewPB } = checkAndUpdatePB(nextStreak);
      if (isNewPB && nextStreak >= 2) {
        setPbStreak(nextStreak);
        toast.success(t('wordAlchemy.streakNewPB', { n: nextStreak }));
      }
      playSound(wasRush ? 'victoryFanfare' : 'wordAccepted');
      burstAt(wasRush ? 'celebration' : nextStreak >= 3 ? 'celebration' : 'sparkle-valid', inputRef.current, wasRush ? 32 : nextStreak >= 3 ? 18 : undefined);
    } else {
      setWrongCount((w) => w + 1);
      setStreak(0);
      onWrongGuess();
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
      setHintDir(alchemyDirHint(input, step.answer, isHe ? 'he' : 'en'));
      setTimeout(() => setHintDir(null), 2000);
    }
  };

  // Admin gate — Word Alchemy stays an admin-only preview per project scope.
  // Render after hooks so order is stable across admin/non-admin renders.
  // Dev bypass lets the game be reached locally for /he playtest.
  const isDev = process.env.NODE_ENV === 'development';
  if (!canSeeInWorkModes && !isDev) {
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

  // Header slot: compact one-row HUD (title chip · streak · progress) + heat bar.
  const header = (
    <div className="mx-auto w-full max-w-2xl space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="inline-flex items-center gap-2 rounded-neo border-2 border-black bg-neo-purple px-3 py-1.5 font-neo-display font-black text-base uppercase tracking-wide text-neo-navy shadow-hard-sm">
          <span ref={flaskRef} className="inline-flex">
            <FlaskConical className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </span>
          {t('wordAlchemy.title')}
        </h1>
        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <span
              className={`inline-flex items-center gap-1 rounded-neo border-2 border-black px-2.5 py-1 font-neo-display font-black text-[10px] uppercase tracking-wide text-neo-navy shadow-hard-sm animate-neo-pop ${
                streak >= pbStreak && pbStreak >= 2
                  ? 'bg-neo-purple text-neo-cream'
                  : 'bg-neo-yellow'
              }`}
            >
              {streak >= pbStreak && pbStreak >= 2 ? `⚗️ ${t('wordAlchemy.streak', { n: streak })}` : t('wordAlchemy.streak', { n: streak })}
            </span>
          )}
          <span
            className="rounded-neo border-2 border-black bg-neo-navy-light px-2.5 py-1.5 font-neo-display font-black text-xs tabular-nums text-neo-white shadow-hard-sm"
            aria-label={t('wordAlchemy.puzzleProgress', { n: puzzleIdx + 1, total: puzzles.length })}
          >
            {puzzleIdx + 1}/{puzzles.length}
          </span>
        </div>
      </div>
      <AlchemyHeatBar heat={heat} maxHeat={maxHeat} />
    </div>
  );

  // Footer slot: keyboard + submit + restart (only when not won)
  const footer = !won ? (
    <div className="mx-auto w-full max-w-2xl space-y-3">
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
        form="word-alchemy-form"
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
    </div>
  ) : null;

  return (
    <GameStage accent="purple" header={header} footer={footer}>
      <ScreenFlashOverlay trigger={winFlash} colorClass="bg-neo-purple/40" />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 animate-[fadeInUp_0.4s_ease-out_both] motion-reduce:animate-none">
        <TopBackLink className="self-start" />
        <ModeCoach mode="wordAlchemy" />

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
          /* Win card + daily reward */
          <div className="space-y-3">
            <div className="rounded-neo border-3 border-black bg-neo-lime p-6 text-center shadow-hard-lg space-y-4">
              <h2 className="font-neo-display font-black text-2xl uppercase text-neo-navy">
                {t('wordAlchemy.wonTitle')}
              </h2>
              <p className="font-neo-body text-sm text-neo-navy/80">{t('wordAlchemy.wonSubtitle')}</p>
              {stepResults.length > 0 && (
                <AlchemyShareCard stepResults={stepResults} puzzleNumber={puzzleIdx + 1} />
              )}
              <button
                type="button"
                onClick={() => resetPuzzle((puzzleIdx + 1) % puzzles.length)}
                className="inline-flex items-center gap-2 rounded-neo border-3 border-black bg-neo-purple px-6 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:animate-neo-press motion-reduce:active:animate-none"
              >
                <ArrowRight className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                {t('wordAlchemy.next')}
              </button>
            </div>
            {soloAward && (
              <SoloRewardCard
                t={t}
                awarded={soloAward.awarded}
                bonus={soloAward.bonus}
                modifier={dailyModifier}
                claimed={soloAward.claimed}
                onPlayAgain={() => resetPuzzle((puzzleIdx + 1) % puzzles.length)}
              />
            )}
          </div>
        ) : (
          /* Active step */
          <form id="word-alchemy-form" onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
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
            {hintDir && (
              <p role="status" aria-live="polite" className="mt-2 text-center font-neo-display text-3xl animate-neo-pop select-none text-neo-orange">
                {hintDir}
              </p>
            )}
          </form>
        )}
      </div>
      {wildcardFound && <WildcardFoundModal onDismiss={() => setWildcardFound(false)} />}
    </GameStage>
  );
}
