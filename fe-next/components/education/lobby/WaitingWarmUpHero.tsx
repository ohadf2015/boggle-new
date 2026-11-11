'use client';

import { useEffect, useMemo, useState } from 'react';
import { Flame, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { pulseLive } from '@/lib/education/liveHaptics';
import { useGameLanguage } from '@/hooks/gameState/selectors';
import { useLanguage } from '@/contexts/LanguageContext';
import { tr, type EduT } from './eduText';
import { initialWarmUp, warmUpLetters, warmUpReducer } from './warmUpTap';
import { WARM_UP_KEYFRAMES } from './WarmUpSpellTiles';

const MILESTONE = 5;
const FX_MS = 420;
const HERO_KEYFRAMES =
  '@keyframes lc-tile-burst{0%{transform:scale(1.3) rotate(-4deg)}60%{transform:scale(.94)}100%{transform:scale(1)}}' +
  '@keyframes lc-plus-float{0%{transform:translate(-50%,0) scale(.6);opacity:1}100%{transform:translate(-50%,-42px) scale(1.2);opacity:0}}' +
  '@keyframes lc-combo-bump{0%{transform:scale(1.5) rotate(-6deg)}100%{transform:scale(1)}}';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black';

type Fx = { index: number; kind: 'hit' | 'miss'; n: number } | null;

/** The lobby's hero game: tap the lit letter of your name, big tiles, a combo you can see grow. */
export function WaitingWarmUpHero({ username, seed, t }: { username: string; seed: number; t: EduT }) {
  const roomLanguage = useGameLanguage();
  const { language } = useLanguage();
  const letters = useMemo(() => warmUpLetters(username, roomLanguage ?? language), [username, roomLanguage, language]);
  const [state, setState] = useState(() => initialWarmUp(seed));
  const [fx, setFx] = useState<Fx>(null);
  const sfx = useSoundEffects();
  const [reducedEffects] = useReducedEffects();

  useEffect(() => {
    if (!fx) return undefined;
    const timer = window.setTimeout(() => setFx((cur) => (cur?.n === fx.n ? null : cur)), FX_MS);
    return () => window.clearTimeout(timer);
  }, [fx]);

  const tap = (index: number) => {
    const next = warmUpReducer(state, { type: 'tap', index });
    setState(next);
    setFx((cur) => ({ index, kind: next.lastHit ? 'hit' : 'miss', n: (cur?.n ?? 0) + 1 }));
    if (!next.lastHit) return;
    const milestone = next.combo % MILESTONE === 0;
    if (milestone) sfx.playStreakMilestoneSound();
    else sfx.playTileSelectSound();
    pulseLive(milestone ? 'big' : 'valid', reducedEffects);
  };

  const hot = state.combo >= 3;
  return (
    <section
      data-testid="waiting-warmup"
      data-kind="tap"
      data-variant="hero"
      aria-label={tr(t, 'academy.live.warmUpTitle', 'Warm-up')}
      className="w-full max-w-md rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light p-3 shadow-hard-lg"
    >
      <style>{WARM_UP_KEYFRAMES + HERO_KEYFRAMES}</style>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="min-w-0 font-neo-display text-sm font-black uppercase leading-tight tracking-wide text-neo-cream">
          {tr(t, 'academy.live.warmUpHint', 'Warm-up: tap the glowing letter!')}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-1 font-neo-display text-base font-black tabular-nums text-neo-black">
            <Star className="size-4" strokeWidth={3} aria-hidden="true" />
            <span data-testid="warmup-score" aria-live="polite">{state.score}</span>
          </span>
          <span
            key={`combo-${state.combo}`}
            data-testid="warmup-combo-hero"
            dir="ltr"
            role="img"
            aria-label={t('mpUi.round.combo', { level: state.combo })}
            className={cn(
              'inline-flex min-w-16 items-center justify-center gap-0.5 rounded-neo border-[3px] px-2 py-1 font-neo-display font-black leading-none tabular-nums shadow-hard-sm',
              state.combo === 0 ? 'border-neo-cream/70 bg-neo-navy text-2xl text-neo-cream/70' : hot ? 'border-neo-black bg-neo-pink text-3xl text-neo-black' : 'border-neo-black bg-neo-orange text-2xl text-neo-black',
              state.combo > 0 && 'motion-safe:animate-[lc-combo-bump_260ms_cubic-bezier(0.34,1.56,0.64,1)]',
            )}
          >
            <Flame className={cn('shrink-0', hot ? 'size-7 fill-neo-yellow' : 'size-6')} strokeWidth={3} aria-hidden="true" />
            <span aria-hidden="true">x{state.combo}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2" dir={letters.some((c) => /\p{Script=Hebrew}/u.test(c)) ? 'rtl' : 'ltr'}>
        {letters.map((letter, i) => {
          const lit = i === state.hot;
          const mine = fx?.index === i ? fx.kind : undefined;
          return (
            <button
              key={i}
              type="button"
              data-testid={`warmup-tile-${i}`}
              data-hot={lit ? 'true' : 'false'}
              data-fx={mine}
              aria-label={lit ? tr(t, 'academy.live.warmUpTapThis', 'Tap this one') : letter}
              onClick={() => tap(i)}
              className={cn(
                FOCUS,
                'relative grid h-16 place-items-center rounded-neo border-[3px] font-neo-display text-3xl font-black leading-none transition-transform duration-100 motion-reduce:transition-none motion-safe:active:scale-90',
                mine === 'miss'
                  ? 'border-neo-black bg-neo-pink text-neo-black motion-safe:animate-[lc-tile-shake_260ms_ease-out]'
                  : mine === 'hit'
                    ? 'border-neo-black bg-neo-cyan text-neo-black motion-safe:animate-[lc-tile-burst_320ms_cubic-bezier(0.34,1.56,0.64,1)]'
                    : lit
                      ? 'z-10 scale-110 border-neo-black bg-neo-lime text-neo-black shadow-hard-sm motion-safe:animate-[lc-tile-glow_900ms_ease-in-out_infinite]'
                      : 'border-neo-cream/70 bg-neo-navy text-neo-cream',
              )}
            >
              {letter}
              {mine === 'hit' && (
                <span
                  key={fx?.n}
                  data-testid="warmup-burst"
                  aria-hidden="true"
                  dir="ltr"
                  className="pointer-events-none absolute start-1/2 top-0 font-neo-display text-xl font-black text-neo-lime [-webkit-text-stroke:1px_rgb(var(--neo-black))] [paint-order:stroke_fill] motion-safe:animate-[lc-plus-float_420ms_ease-out_forwards] motion-reduce:hidden rtl:translate-x-1/2"
                >
                  +1
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default WaitingWarmUpHero;
