'use client';

import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import Avatar from '@/components/Avatar';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import { useGameMode } from '@/hooks/gameState/selectors';
import { prefersStaticFullscreenOverlay } from '@/lib/native/webViewLayerFlash';
import { cn } from '@/lib/utils';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { MODE_FILL, MODE_TEXT, FALLBACK_MODE_ICON, MODE_ICONS, roundModeMeta, classroomRoundModeMeta, BOSS_ROUND_META } from './roundModes';
import { useBossActive } from '@/stores/classroomBossStore';
import { CoachDemo } from '@/components/tutorial/CoachDemo';
import { MiniBoardDemo } from '@/components/tutorial/MiniBoardDemo';
import { PopIn } from '@/components/motion/PopIn';
import { captionKeyFor, getModeCoach } from '@/lib/tutorial/modeCoachContent';
import { useTypingDesktop } from '@/lib/input/typedWordHint';
import { mpCoachMode } from '@/lib/tutorial/mpCoachMode';
import styles from './round.module.css';

/** Max avatars in the "who am I about to play?" row; the rest become "+N". */
export const MAX_COUNTDOWN_AVATARS = 5;
/** Each numeral holds for this long. */
export const COUNT_STEP_MS = 1000;
/** GO! holds this long before the round is revealed. */
export const GO_HOLD_MS = 650;

const RING_TICKS = Array.from({ length: 12 }, (_, i) => i);
const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const HOP_STEP_MS = 90;

export interface CountdownPlayer {
  username: string;
  avatar?: { customAvatar?: CustomAvatarConfig | null } | null;
  isBot?: boolean;
  disconnected?: boolean;
}

export interface MpCountdownStageProps {
  onComplete?: () => void;
  t?: (key: string, params?: Record<string, string | number>) => string;
  players?: ReadonlyArray<CountdownPlayer>;
  /** A classroom room: the teacher's mode wins over the store's board mode (null = not resolved yet). */
  classroom?: { mode: string | null; vocabQuizVariant?: string | null } | null;
}


/** Pick a glanceable few: connected humans first, then bots. */
export function selectCountdownAvatars(players?: ReadonlyArray<CountdownPlayer>): CountdownPlayer[] {
  if (!players || players.length === 0) return [];
  const connected = players.filter((p) => !p.disconnected);
  const humans = connected.filter((p) => !p.isBot);
  const bots = connected.filter((p) => p.isBot);
  return [...humans, ...bots].slice(0, MAX_COUNTDOWN_AVATARS);
}

// Module-level latch: blocks a duplicate mount within DUP_GUARD_MS of the last
// completed countdown. MP `showStartAnimation` can race false→true via dual
// handlers (pendingGameStart effect + socket listener) when server retries
// arrive without a stable messageId; the second mount is a no-op that reports
// done on the next tick instead of replaying 3-2-1-GO.
const DUP_GUARD_MS = 4000;
let lastCompletedAt = 0;

/** Test-only reset to clear the latch between test cases. */
export function __resetCountdownDupGuard(): void {
  lastCompletedAt = 0;
}

/**
 * The 3-2-1-GO stage. A SOLID `bg-neo-navy` full-screen layer that appears
 * statically (no opacity tween in or out — pitfall class 5), so the board is
 * hidden until GO. Mode badge + one-line rule tell you what you're about to
 * play; the roster row tells you who. Only the numeral animates (transform).
 */
function MpCountdownStageImpl({ onComplete, t: tProp, players, classroom }: MpCountdownStageProps) {
  const { t: tCtx, language, dir } = useLanguage();
  const t = tProp ?? tCtx;
  const [isDuplicate] = useState(() => Date.now() - lastCompletedAt < DUP_GUARD_MS);
  const [done, setDone] = useState(isDuplicate);
  const [count, setCount] = useState(3);
  const { playCountdownBeep } = useSoundEffects();
  const reduceMotion = useShouldReduceMotion();
  const [staticLayer] = useState(() => prefersStaticFullscreenOverlay());
  const storeMode = useGameMode();
  const bossRound = useBossActive();
  const typingDesktop = useTypingDesktop();
  const mode = bossRound
    ? BOSS_ROUND_META
    : classroom ? classroomRoundModeMeta(classroom.mode, classroom.vocabQuizVariant) : roundModeMeta(storeMode);
  const coachKey = bossRound ? undefined : mpCoachMode((classroom ? classroom.mode : storeMode) ?? undefined);
  const howTo = coachKey ? getModeCoach(coachKey) : null;

  // onComplete in a ref: parent re-renders (timeUpdate) pass new callbacks and
  // must never reset the countdown clock (the old "stuck at 3" bug).
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isDuplicate) return undefined;
    const id = setTimeout(() => onCompleteRef.current?.(), 0);
    return () => clearTimeout(id);
  }, [isDuplicate]);

  useEffect(() => {
    if (!done && count > 0) playCountdownBeep(count);
  }, [count, done, playCountdownBeep]);

  useEffect(() => {
    if (done) return undefined;
    if (count > 0) {
      const id = setTimeout(() => setCount(count - 1), COUNT_STEP_MS);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      setDone(true);
      lastCompletedAt = Date.now();
      onCompleteRef.current?.();
    }, GO_HOLD_MS);
    return () => clearTimeout(id);
  }, [count, done]);

  if (done) return null;

  const isGo = count === 0;
  const avatars = selectCountdownAvatars(players);
  const overflow = Math.max(0, (players?.filter((p) => !p.disconnected).length ?? 0) - avatars.length);
  const Icon = MODE_ICONS[mode.icon] ?? FALLBACK_MODE_ICON;
  const goText = t('countdown.go');
  const label = isGo ? (goText && goText !== 'countdown.go' ? goText : 'GO!') : String(count);
  const connected = players?.filter((p) => !p.disconnected) ?? [];
  const botCount = connected.filter((p) => p.isBot).length;
  const soloVsBots = !classroom && botCount > 0 && connected.length - botCount === 1;

  const animate = !reduceMotion && !staticLayer;
  const demo = howTo?.steps[0];

  return (
    <div
      data-testid="mp-countdown"
      data-mode={mode.slug}
      role="status"
      aria-live="assertive"
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-[min(3vh,1.5rem)] overflow-hidden bg-neo-navy opacity-100 text-neo-white pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] px-4 select-none tv:gap-10"
    >
      {/* 1. The mode card springs in: what you're about to play, in one line. */}
      <PopIn
        data-testid="mp-countdown-card"
        className="flex w-full max-w-sm flex-col items-center gap-2 rounded-[28px] border-3 border-neo-black bg-neo-navy-light px-5 pt-5 pb-4 text-center shadow-[0_6px_0_rgb(var(--neo-black))] tv:max-w-2xl tv:gap-4 tv:p-10"
      >
        <span
          data-testid="mp-countdown-icon"
          className={cn('-mt-12 grid h-16 w-16 place-items-center rounded-2xl border-3 border-neo-black text-neo-black shadow-[0_4px_0_rgb(var(--neo-black))] tv:-mt-20 tv:h-28 tv:w-28', MODE_FILL[mode.color])}
        >
          <Icon aria-hidden="true" className="h-9 w-9 tv:h-16 tv:w-16" strokeWidth={2.5} />
        </span>
        <span data-testid="mp-countdown-mode" className={cn('font-neo-display font-bold uppercase tracking-wide text-3xl tv:text-6xl', MODE_TEXT[mode.color])}>
          {t(mode.nameKey)}
        </span>
        <p data-testid="mp-countdown-rule" dir="auto" className="font-neo-body font-bold text-base tv:text-3xl text-neo-white/85 leading-snug text-balance">
          {t(mode.ruleKey)}
        </p>
        {/* 2. The move itself, looping: a finger swipes a real word and it scores. */}
        {demo && howTo && (
          <PopIn delay={0.15} data-testid="mp-countdown-howto" className="mt-1 flex flex-col items-center gap-1.5 tv:scale-150 tv:my-8">
            {demo.demo === 'drag' ? (
              <MiniBoardDemo word={t('mpUi.round.demoWord')} points={3} rtl={dir === 'rtl'} reduced={reduceMotion} />
            ) : (
              <div dir="ltr" className="w-64">
                <CoachDemo demo={demo.demo} accent={howTo.accent} emoji={demo.emoji} />
              </div>
            )}
            <span dir="auto" className={demo.demo === 'drag' ? 'sr-only' : 'font-neo-body text-sm font-bold text-neo-white/70'}>{t(captionKeyFor(demo, typingDesktop))}</span>
          </PopIn>
        )}
      </PopIn>

      {/* 4. 3-2-1: each numeral springs in while a ring of ticks fills around it, then GO bursts. */}
      <div className="relative grid aspect-square h-[min(24vh,11rem)] max-w-full place-items-center tv:h-[22rem]">
        {!isGo && (
          <div
            key={`ring-${count}`}
            data-testid="mp-countdown-ring"
            aria-hidden="true"
            className={cn('absolute inset-0', animate && styles.ringFill)}
          >
            {RING_TICKS.map((i) => (
              <span key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 30}deg)` }}>
                <span
                  className={cn('absolute left-1/2 top-0 -ms-1.5 h-4 w-3 rounded-full border-2 border-neo-black tv:h-7 tv:w-5', MODE_FILL[mode.color])}
                  style={animate ? { animationDelay: `${Math.round((i * COUNT_STEP_MS * 0.85) / RING_TICKS.length)}ms` } : undefined}
                />
              </span>
            ))}
          </div>
        )}
        {isGo && animate && (
          <>
            <span aria-hidden="true" className={cn('pointer-events-none absolute w-32 h-32 rounded-full border-8 border-neo-lime', styles.goRing)} />
            {RAY_ANGLES.map((a) => (
              <span
                key={a}
                aria-hidden="true"
                className={cn('pointer-events-none absolute h-8 w-3 rounded-full bg-neo-yellow', styles.goRay)}
                style={{ '--ray-a': `${a}deg` } as CSSProperties}
              />
            ))}
          </>
        )}
        <span
          key={count}
          data-testid="mp-countdown-numeral"
          className={cn(
            'relative max-w-full text-center font-neo-display font-bold leading-none tabular-nums [text-shadow:0.06em_0.06em_0_var(--neo-black)]',
            isGo ? 'text-[min(26vh,14vw)] md:text-[min(26vh,20vw)] text-neo-lime' : 'text-[min(20vh,36vw)] text-neo-white',
            !reduceMotion && styles.countPunch,
          )}
        >
          {label}
        </span>
      </div>

      {/* 3. Who you're about to face: avatars hop in one by one. */}
      <div className="flex flex-col items-center gap-2 tv:gap-4">
        {avatars.length > 0 && (
          <div data-testid="countdown-avatars" className="flex items-center justify-center gap-1.5">
            {avatars.map((p, i) => (
              <span
                key={p.username}
                data-hop={i}
                className={cn('rounded-full border-3 border-neo-black bg-neo-navy-light shadow-[0_3px_0_rgb(var(--neo-black))]', animate && styles.hopIn)}
                style={{ width: 'calc(48px * var(--mp-u, 1))', height: 'calc(48px * var(--mp-u, 1))', ...(animate ? { animationDelay: `${300 + i * HOP_STEP_MS}ms` } : null) }}
              >
                <Avatar pixelSize={44} customAvatar={p.avatar?.customAvatar ?? null} userId={p.username} className="rounded-full" />
              </span>
            ))}
            {overflow > 0 && (
              <span className="ms-1 rounded-full border-2 border-neo-black bg-neo-navy-light px-2 py-0.5 text-sm font-bold">+{overflow}</span>
            )}
          </div>
        )}
        {soloVsBots ? (
          <p data-testid="mp-countdown-vs-bots" className="rounded-full border-3 border-neo-black bg-neo-cyan px-4 py-1 shadow-[0_3px_0_rgb(var(--neo-black))] font-neo-display font-bold uppercase tracking-wide rtl:tracking-normal text-sm tv:text-2xl text-neo-black">
            {t(pluralKeyOf('mpUi.round.youVsBots', botCount, language), { count: botCount })}
          </p>
        ) : (
          <p className="font-neo-display font-bold uppercase tracking-[0.2em] rtl:tracking-normal text-sm tv:text-2xl text-neo-white/60">
            {t('mpUi.round.getReady')}
          </p>
        )}
      </div>
    </div>
  );
}

export const MpCountdownStage = memo(MpCountdownStageImpl);
MpCountdownStage.displayName = 'MpCountdownStage';
