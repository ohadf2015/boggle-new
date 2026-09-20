'use client';

/**
 * Everything a cleared node moved OUTSIDE the run, made visible:
 *  - the ledger strip (xp / coins / season points / day streak), counted up
 *  - a rank ribbon + the app's own level-up celebration when the account levels
 *  - a toast per lifetime achievement unlocked
 *
 * Nothing is re-implemented: the celebration is `components/animations/
 * LevelUpCelebration` (the same one the multiplayer results screen opens, see
 * components/results/ResultsModals.tsx) and the toast is
 * `components/achievements/AchievementToast`, both loaded lazily so a node that
 * grants neither pays nothing.
 *
 * Sequencing matters. A node clear already had its own fullscreen stamp before
 * this mounts, and mid-run the Continue button is gated on tapping the chest —
 * so the ACCOUNT level-up shows as a persistent rank ribbon there and only opens
 * the fullscreen celebration where nothing is gated behind it (`celebrate`).
 * Either way it states the rank it reached, never a bare "level up".
 */
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronsUp } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { getAchievementIcon } from '@/constants/achievementIcons';
import type { AdventureAchievementDef, AdventureAchievementId } from '@/utils/adventureAchievementUtils';
import type { RunResult } from '../runTypes';
import { ecosystemGains, hasEcosystemGains } from './ecosystemGains';
import EcosystemStrip from './EcosystemStrip';
import { cn } from '@/lib/utils';

const LevelUpCelebration = dynamic(() => import('@/components/animations/LevelUpCelebration'), { ssr: false });

interface Props {
  result: RunResult;
  /** Seconds of runway before the strip counts (the screen's own beats land first). */
  delay?: number;
  /**
   * Open the app's fullscreen level-up celebration on an account level-up.
   * OFF mid-run on purpose: the cleared screen's Continue button is disabled
   * until the chest is tapped, and a 4s fullscreen modal over that chest would
   * block the only way forward. Mid-run the rank ribbon carries the news; the
   * fullscreen beat belongs to the run-complete screen, which has no such gate.
   */
  celebrate?: boolean;
  className?: string;
}

/** Stagger between achievement toasts so several unlocks don't stack into a wall. */
const TOAST_GAP_MS = 900;
/** The account level-up waits out the strip so it never collides with the node burst. */
const LEVEL_UP_DELAY_MS = 1800;

/**
 * A lifetime achievement key (VETERAN, CENTURION, …) dressed as the toast's
 * payload. `id` is only a fallback label + toast key there, so the cast is safe;
 * the copy comes from `achievements.<KEY>.*`, which every locale already has.
 */
function lifetimeDef(key: string): AdventureAchievementDef {
  return {
    id: key as AdventureAchievementId,
    nameKey: `achievements.${key}.name`,
    descriptionKey: `achievements.${key}.description`,
    category: 'progression',
    icon: getAchievementIcon(key),
    oneTime: true,
  };
}

export default function EcosystemRewards({ result, delay = 0, celebrate = false, className }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const { playXpGainSound } = useSoundEffects();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const firedRef = useRef(false);
  const gains = ecosystemGains(result);
  const levelUp = result.levelUp;
  const unlocked = result.achievementsUnlocked ?? [];
  const title = levelUp?.newTitles?.[0];

  // One-shot: the sound, the toasts, and the level-up hand-off.
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (gains.length) timers.push(setTimeout(() => playXpGainSound?.(), Math.round(delay * 1000)));

    if (unlocked.length) {
      void import('@/components/achievements/AchievementToast').then(({ showAchievementToast }) => {
        unlocked.forEach((key, i) => {
          timers.push(setTimeout(
            () => showAchievementToast({ achievement: lifetimeDef(key), count: 1, isNew: true }),
            Math.round(delay * 1000) + 400 + i * TOAST_GAP_MS,
          ));
        });
      }).catch(() => { /* toast art is a bonus beat — never break the result screen */ });
    }

    if (levelUp && celebrate) timers.push(setTimeout(() => setShowLevelUp(true), Math.round(delay * 1000) + LEVEL_UP_DELAY_MS));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on mount; `result` is fixed for this screen's life
  }, []);

  if (!hasEcosystemGains(result)) return null;

  return (
    <div className={cn('w-full', className)} data-testid="eco-rewards">
      <EcosystemStrip result={result} delay={delay} />

      {levelUp && (
        <motion.div
          data-testid="eco-rank-ribbon"
          initial={reduce ? false : { opacity: 0, scaleX: 0.7 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20, delay: delay + 0.5 }}
          className="mt-1.5 flex items-center justify-center gap-1.5 rounded-xl border-[3px] border-black bg-neo-yellow px-2.5 py-1.5 text-black shadow-[3px_3px_0_#000]"
        >
          <ChevronsUp className="h-5 w-5 shrink-0" strokeWidth={3} aria-hidden />
          <span className="font-neo-display text-sm font-bold leading-tight">
            {t('adventurePlay.eco.rank', { level: levelUp.newLevel })}
            {title && <span className="opacity-80"> · {t(`landing.home.titles.${title}`)}</span>}
          </span>
        </motion.div>
      )}

      {levelUp && showLevelUp && (
        <LevelUpCelebration
          level={levelUp.newLevel}
          show
          autoDismissAfter={4000}
          onDismiss={() => setShowLevelUp(false)}
        />
      )}
    </div>
  );
}
