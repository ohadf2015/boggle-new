'use client';

import { memo, useEffect, useRef, useState } from 'react';
import Avatar from '@/components/Avatar';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import { useGameMode } from '@/hooks/gameState/selectors';
import { prefersStaticFullscreenOverlay } from '@/lib/native/webViewLayerFlash';
import { cn } from '@/lib/utils';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { MODE_FILL, MODE_TEXT, FALLBACK_MODE_ICON, MODE_ICONS, roundModeMeta, classroomRoundModeMeta } from './roundModes';
import styles from './round.module.css';

/** Max avatars in the "who am I about to play?" row; the rest become "+N". */
export const MAX_COUNTDOWN_AVATARS = 5;
/** Each numeral holds for this long. */
export const COUNT_STEP_MS = 1000;
/** GO! holds this long before the round is revealed. */
export const GO_HOLD_MS = 650;

export interface CountdownPlayer {
  username: string;
  avatar?: { customAvatar?: CustomAvatarConfig | null } | null;
  isBot?: boolean;
  disconnected?: boolean;
}

export interface MpCountdownStageProps {
  onComplete?: () => void;
  t?: (key: string) => string;
  players?: ReadonlyArray<CountdownPlayer>;
  /** A classroom room: the teacher's mode wins over the store's board mode (null = not resolved yet). */
  classroom?: { mode: string | null } | null;
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
  const { t: tCtx } = useLanguage();
  const t = tProp ?? tCtx;
  const [isDuplicate] = useState(() => Date.now() - lastCompletedAt < DUP_GUARD_MS);
  const [done, setDone] = useState(isDuplicate);
  const [count, setCount] = useState(3);
  const { playCountdownBeep } = useSoundEffects();
  const reduceMotion = useShouldReduceMotion();
  const [staticLayer] = useState(() => prefersStaticFullscreenOverlay());
  const storeMode = useGameMode();
  const mode = classroom ? classroomRoundModeMeta(classroom.mode) : roundModeMeta(storeMode);

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

  return (
    <div
      data-testid="mp-countdown"
      data-mode={mode.slug}
      role="status"
      aria-live="assertive"
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-between overflow-hidden bg-neo-navy opacity-100 text-neo-white pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] px-4 select-none"
    >
      {/* What you're about to play (mode badge + one-line rule) */}
      <div className="flex flex-col items-center gap-3 tv:gap-5 text-center max-w-md tv:max-w-3xl">
        <span
          data-testid="mp-countdown-mode"
          className={cn(
            'inline-flex items-center gap-2 rounded-neo border-3 border-neo-black px-4 py-1.5 shadow-hard font-neo-display font-bold uppercase tracking-wide text-neo-black',
            'text-lg lg:text-2xl tv:text-4xl',
            MODE_FILL[mode.color],
          )}
        >
          <Icon aria-hidden="true" className="w-5 h-5 lg:w-6 lg:h-6 tv:w-9 tv:h-9" strokeWidth={2.75} />
          {t(mode.nameKey)}
        </span>
        <p data-testid="mp-countdown-rule" dir="auto" className="font-neo-body font-bold text-base lg:text-xl tv:text-3xl text-neo-white/90 leading-snug text-balance">
          {t(mode.ruleKey)}
        </p>
      </div>

      {/* The numeral — 40vh, keyed so the punch runs once per step */}
      <div className="relative flex flex-1 min-h-0 items-center justify-center w-full">
        {isGo && !staticLayer && (
          <span
            aria-hidden="true"
            className={cn('pointer-events-none absolute w-32 h-32 rounded-full border-8 border-neo-lime', styles.goRing)}
          />
        )}
        <span
          key={count}
          data-testid="mp-countdown-numeral"
          className={cn(
            'relative font-neo-display font-bold leading-none tabular-nums [text-shadow:0.06em_0.06em_0_var(--neo-black)]',
            isGo ? 'text-[min(26vh,46vw)] text-neo-lime' : cn('text-[40vh]', MODE_TEXT[mode.color]),
            !reduceMotion && styles.countPunch,
          )}
        >
          {label}
        </span>
      </div>

      {/* Who you're about to face */}
      <div className="flex flex-col items-center gap-2 tv:gap-4">
        {avatars.length > 0 && (
          <div data-testid="countdown-avatars" className="flex items-center justify-center -space-x-2 rtl:space-x-reverse">
            {avatars.map((p) => (
              <span
                key={p.username}
                className="rounded-full border-3 border-neo-black bg-neo-navy-light shadow-hard-sm"
                style={{ width: 'calc(48px * var(--mp-u, 1))', height: 'calc(48px * var(--mp-u, 1))' }}
              >
                <Avatar pixelSize={44} customAvatar={p.avatar?.customAvatar ?? null} userId={p.username} className="rounded-full" />
              </span>
            ))}
            {overflow > 0 && (
              <span className="ms-3 rounded-full border-2 border-neo-black bg-neo-navy-light px-2 py-0.5 text-sm font-bold">+{overflow}</span>
            )}
          </div>
        )}
        <p className="font-neo-display font-bold uppercase tracking-[0.2em] rtl:tracking-normal text-sm tv:text-2xl text-neo-white/60">
          {t('mpUi.round.getReady')}
        </p>
      </div>
    </div>
  );
}

export const MpCountdownStage = memo(MpCountdownStageImpl);
MpCountdownStage.displayName = 'MpCountdownStage';
