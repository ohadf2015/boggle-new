'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Coins, Flag, Gem, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getWaveClearReward, type BlastWaveClearReward } from '@/components/blast/legacy/utils/blastWaveConfig';
import { BlastRunRibbon } from './BlastRunRibbon';
import { THEME_ICON, accentColor, getWaveTheme } from './waveTheme';
import { useCountUp } from './useCountUp';
import styles from './progress.module.css';

gsap.registerPlugin(useGSAP);

interface BlastWaveClearProps {
  wave: number;
  waveScore: number;
  words: number;
  clearPct: number;
  reward?: BlastWaveClearReward;
  runScoreBefore: number;
  runCoinsBefore: number;
  runDiamondsBefore: number;
  waveDiamonds: number;
  /** Furthest wave cleared on any earlier run (0 = none). */
  recordWave: number;
  autoContinueMs: number;
  onContinue: () => void;
  /** Extra preview of the next wave, e.g. its modifier badge. */
  nextExtra?: ReactNode;
}

type CounterKey = 'score' | 'coins' | 'diamonds';

/** Between-wave beat: stars slam, the haul flies into the run totals, the next theme is teased. */
export function BlastWaveClear({
  wave, waveScore, words, clearPct, reward, runScoreBefore, runCoinsBefore, runDiamondsBefore,
  waveDiamonds, recordWave, autoContinueMs, onContinue, nextExtra,
}: BlastWaveClearProps) {
  const { t } = useLanguage();
  const { playAchievementSound } = useSoundEffects();
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const continuedRef = useRef(false);

  const stars = reward?.stars ?? 1;
  const prizeCoins = (reward?.coins ?? 0) + (reward?.chestBonus ?? 0);
  const theme = getWaveTheme(wave);
  const nextWave = wave + 1;
  const next = getWaveTheme(nextWave);
  const NextIcon = THEME_ICON[next.id];
  const nextAccent = accentColor(next);
  const nextIsRecord = recordWave > 0 && nextWave === recordWave + 1;
  const nextMult = next.params.rewardMultiplier;
  const nextPrize = getWaveClearReward(nextWave, 1).coins;

  const [landed, setLanded] = useState<Record<CounterKey, boolean>>({ score: false, coins: false, diamonds: false });
  const land = useCallback((key: CounterKey) => setLanded((l) => ({ ...l, [key]: true })), []);
  const score = useCountUp(runScoreBefore + (landed.score ? waveScore : 0), 500, reducedMotion);
  const coins = useCountUp(runCoinsBefore + (landed.coins ? prizeCoins : 0), 500, reducedMotion);
  const diamonds = useCountUp(runDiamondsBefore + (landed.diamonds ? waveDiamonds : 0), 400, reducedMotion);

  const go = useCallback(() => {
    if (continuedRef.current) return;
    continuedRef.current = true;
    onContinue();
  }, [onContinue]);

  useEffect(() => {
    const id = setTimeout(go, autoContinueMs);
    return () => clearTimeout(id);
  }, [go, autoContinueMs]);

  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(autoContinueMs / 1000));
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useGSAP(
    () => {
      if (reducedMotion) {
        setLanded({ score: true, coins: true, diamonds: true });
        return undefined;
      }
      const ghosts: HTMLElement[] = [];
      const flyTo = (key: CounterKey) => () => {
        const pill = rootRef.current?.querySelector<HTMLElement>(`[data-tally="${key}"]`);
        const counter = rootRef.current?.querySelector<HTMLElement>(`[data-counter="${key}"]`);
        if (!pill || !counter) return land(key);
        const a = pill.getBoundingClientRect();
        const b = counter.getBoundingClientRect();
        // A ghost flies so the breakdown stays readable after the haul lands.
        const ghost = pill.cloneNode(true) as HTMLElement;
        Object.assign(ghost.style, { position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, margin: '0', zIndex: '80', pointerEvents: 'none' });
        ghost.removeAttribute('data-testid');
        document.body.appendChild(ghost);
        ghosts.push(ghost);
        gsap.to(ghost, {
          x: b.left + b.width / 2 - (a.left + a.width / 2),
          y: b.top + b.height / 2 - (a.top + a.height / 2),
          scale: 0.35,
          autoAlpha: 0,
          duration: 0.45,
          ease: 'power2.in',
          onComplete: () => {
            ghost.remove();
            land(key);
          },
        });
      };
      gsap
        .timeline({ delay: 0.1 })
        .from('[data-clear="title"]', { scale: 1.8, autoAlpha: 0, duration: 0.25, ease: 'back.out(1.8)' })
        .from('[data-testid="blast-clear-star"]', {
          scale: 3, rotate: -50, autoAlpha: 0, duration: 0.28, ease: 'back.out(2.5)', stagger: 0.16,
          onStart: playAchievementSound,
        })
        .to('[data-clear="stars"]', { y: 4, duration: 0.05, yoyo: true, repeat: 3 }, '-=0.1')
        .from('[data-tally]', { y: 24, autoAlpha: 0, duration: 0.22, stagger: 0.08, ease: 'power2.out' })
        .add(flyTo('score'), '+=0.35')
        .add(flyTo('coins'), '+=0.12')
        .add(flyTo('diamonds'), '+=0.12')
        .from('[data-clear="next"]', { x: 40, autoAlpha: 0, duration: 0.3, ease: 'back.out(1.4)' }, '-=0.1');
      return () => ghosts.forEach((g) => g.remove());
    },
    { scope: rootRef, dependencies: [reducedMotion] },
  );

  const counters: Array<{ key: CounterKey; value: number; Icon: typeof Star; tone: string }> = [
    { key: 'score', value: score, Icon: Star, tone: 'text-neo-yellow' },
    { key: 'coins', value: coins, Icon: Coins, tone: 'text-neo-yellow' },
    { key: 'diamonds', value: diamonds, Icon: Gem, tone: 'text-neo-cyan' },
  ];
  const tallies: Array<{ key: CounterKey; amount: number; Icon: typeof Star; label: string }> = [
    { key: 'score', amount: waveScore, Icon: Star, label: t('blastProgress.waveScore') },
    { key: 'coins', amount: prizeCoins, Icon: Coins, label: t('blastProgress.coins') },
    { key: 'diamonds', amount: waveDiamonds, Icon: Gem, label: t('blastProgress.diamonds') },
  ];

  return (
    <div
      ref={rootRef}
      data-testid="blast-wave-clear"
      className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-4 pb-6 pt-safe tv:gap-7"
    >
      <div className="flex w-full max-w-sm items-center justify-center gap-2 pt-3 tv:max-w-2xl">
        {counters.map(({ key, value, Icon, tone }) => (
          <span
            key={key}
            data-counter={key}
            className={cn(
              'flex items-center gap-1 rounded-lg border-2 border-neo-black bg-neo-navy-light px-2.5 py-1 font-neo-display text-sm font-black tabular-nums text-neo-white shadow-hard-sm tv:text-2xl',
              landed[key] && styles.pulse,
              key === 'diamonds' && landed[key] && waveDiamonds > 0 && styles.shine,
            )}
          >
            <Icon className={cn('h-4 w-4 tv:h-6 tv:w-6', tone)} strokeWidth={3} fill="currentColor" aria-hidden="true" />
            {value.toLocaleString()}
          </span>
        ))}
      </div>

      <h2
        data-clear="title"
        className="text-center font-neo-display text-3xl font-black uppercase leading-none [text-shadow:3px_3px_0_var(--neo-black)] tv:text-6xl"
        style={{ color: accentColor(theme) }}
      >
        {t('blastProgress.cleared', { wave })}
      </h2>

      <div data-clear="stars" className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <span key={i} data-testid="blast-clear-star" data-earned={i < stars ? 'true' : 'false'}>
            <Star
              className={cn('h-12 w-12 drop-shadow-[3px_3px_0_var(--neo-black)] tv:h-20 tv:w-20', i < stars ? 'text-neo-yellow' : 'text-neo-white/20')}
              fill="currentColor"
              strokeWidth={2}
            />
          </span>
        ))}
      </div>

      <div className="flex w-full max-w-sm justify-center gap-2 tv:max-w-2xl">
        {tallies.map(({ key, amount, Icon, label }) => (
          <span
            key={key}
            data-tally={key}
            data-testid={`blast-clear-tally-${key}`}
            aria-label={`${label} +${amount}`}
            className="flex items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-lime px-3 py-1.5 font-neo-display text-base font-black tabular-nums text-neo-black shadow-hard tv:text-3xl"
          >
            <Icon className="h-4 w-4 tv:h-7 tv:w-7" strokeWidth={3} aria-hidden="true" />+{amount.toLocaleString()}
          </span>
        ))}
      </div>
      <p className="-mt-2 font-neo-body text-xs text-neo-white/80 tv:text-lg">
        {words} {t('blast.wordsFound')} · {Math.round(clearPct)}% {t('blast.cleared')}
      </p>

      <section
        data-clear="next"
        data-testid="blast-clear-next"
        data-theme={next.id}
        className="w-full max-w-sm rounded-neo border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard-lg tv:max-w-2xl tv:p-6"
        style={{ borderInlineStartColor: nextAccent, borderInlineStartWidth: 8 }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-neo-display text-[11px] font-black uppercase tracking-[0.2em] text-neo-white/70 tv:text-base">
            {t('blastProgress.nextUp')}
          </span>
          {nextIsRecord && (
            <span className="flex items-center gap-1 rounded-md border-2 border-neo-black bg-neo-yellow px-1.5 py-0.5 font-neo-display text-[10px] font-black uppercase text-neo-black tv:text-sm">
              <Flag className="h-3 w-3" fill="currentColor" aria-hidden="true" />
              {t('blastProgress.record')}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-3 border-neo-black text-neo-black shadow-hard tv:h-20 tv:w-20"
            style={{ backgroundColor: nextAccent }}
          >
            <NextIcon className="h-7 w-7 tv:h-11 tv:w-11" strokeWidth={2.75} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-neo-display text-xl font-black uppercase leading-tight tv:text-4xl" style={{ color: nextAccent }}>
              {t(next.nameKey)}
            </p>
            <p className="font-neo-body text-sm text-neo-white tv:text-xl">{t(next.goalKey)}</p>
          </div>
          <span
            data-testid="blast-clear-next-reward"
            className="flex shrink-0 items-center gap-1 rounded-md border-2 border-neo-black bg-neo-yellow px-2 py-1 font-neo-display text-xs font-black text-neo-black tv:text-lg"
          >
            <Coins className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            {nextMult > 1
              ? t('blastProgress.bigReward', { mult: String(nextMult) })
              : t('blastProgress.reward', { coins: String(nextPrize) })}
          </span>
        </div>
        <div className="mt-3 flex justify-center">
          <BlastRunRibbon wave={nextWave} recordWave={recordWave} />
        </div>
        {nextExtra && <div className="mt-3 flex justify-center">{nextExtra}</div>}
      </section>

      <div className="w-full max-w-sm tv:max-w-2xl">
        <button
          type="button"
          data-testid="next-wave-button"
          onClick={go}
          className="relative w-full overflow-hidden rounded-neo border-3 border-neo-black bg-neo-lime px-4 py-4 font-neo-display text-xl font-black uppercase text-neo-black shadow-hard-lg transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard tv:py-6 tv:text-4xl"
        >
          {t('blastProgress.play', { wave: nextWave })}
          <span
            aria-hidden="true"
            className={cn('absolute inset-x-0 bottom-0 h-1.5 bg-neo-black/40', styles.drain)}
            style={{ ['--drain-ms' as string]: `${autoContinueMs}ms` }}
          />
        </button>
        <p className="mt-2 text-center font-neo-body text-xs text-neo-white/70 tv:text-lg" aria-live="off">
          {t('blastProgress.autoIn', { seconds: secondsLeft })}
        </p>
      </div>
    </div>
  );
}
