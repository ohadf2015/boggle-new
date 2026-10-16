'use client';

import { useEffect, useRef, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { hapticGameWin } from '@/utils/haptics';
import { useOverlayQuietZoneClaim } from '@/lib/overlayQuietZone';
import { CHEST_RARITIES, type ClassroomChestReveal } from '@/shared/constants/classroomEconomy';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import RewardChipRow from '@/components/education/rewards/RewardChipRow';
import CoinFlight from '@/components/education/rewards/CoinFlight';
import ChestStage from './ChestStage';
import { useChestChips } from './chestChips';
import { chestCoinCount, chestHeadlineKey, chestRays, nextChestPhase, oddsLabel, tapChestPhase, type ChestPhase } from './chestPhase';

interface RewardChestProps {
  reveal: ClassroomChestReveal;
  /** The student's avatar as it is now. The reveal dresses it in the chest part. */
  wearing: CustomAvatarConfig;
  onClose: () => void;
}

const SHAKE_MS = 600;
const BURST_MS = 700;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * Full-screen collect moment. Dark-only (hardcoded navy). Tap the chest, it
 * shakes, bursts, and pays out; a tap anywhere skips straight to the payout.
 * The sound and haptic fire once, at the burst, however the student gets there.
 */
export default function RewardChest({ reveal, wearing, onClose }: RewardChestProps) {
  const { t, dir } = useLanguage();
  const { playChestOpenSound, playCoinCascadeSound } = useSoundEffects();
  const reduced = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<ChestPhase>(reduced ? 'revealed' : 'sealed');
  const [skipped, setSkipped] = useState(false);
  const cued = useRef(false);
  const chestRef = useRef<HTMLDivElement>(null);
  const chips = useChestChips(reveal, wearing);
  const rays = chestRays(reveal.rarity);
  useOverlayQuietZoneClaim(true, 'reward-chest');

  useEffect(() => {
    if (phase !== 'shaking' && phase !== 'bursting') return undefined;
    const id = setTimeout(() => setPhase(nextChestPhase(phase, reduced)), phase === 'shaking' ? SHAKE_MS : BURST_MS);
    return () => clearTimeout(id);
  }, [phase, reduced]);

  useEffect(() => {
    if (cued.current || (phase !== 'bursting' && phase !== 'revealed')) return;
    cued.current = true;
    playChestOpenSound?.();
    hapticGameWin();
  }, [phase, playChestOpenSound]);

  const tap = () => {
    if (phase === 'revealed') return;
    if (phase !== 'sealed') setSkipped(true);
    setPhase(tapChestPhase(phase, reduced));
  };

  const revealed = phase === 'revealed';
  const coins = revealed && !reduced && !skipped ? chestCoinCount(reveal.roundCash) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('economy.chest.title')}
      dir={dir}
      onClick={tap}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && revealed) onClose();
      }}
      className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden bg-neo-navy text-white"
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        {!revealed && (
          <h2 className="pt-2 text-center font-neo-display text-3xl font-black uppercase tracking-wide" style={{ textShadow: '3px 3px 0 #000' }}>
            {t('economy.chest.title')}
          </h2>
        )}

        <ChestStage ref={chestRef} phase={phase} rarity={reveal.rarity} onTap={tap} openLabel={t('economy.chest.open')} />

        {phase === 'sealed' && (
          <p className="rounded-full border-[3px] border-black bg-neo-lime px-5 py-1.5 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard-lg">
            {t('economy.chest.tapToOpen')}
          </p>
        )}

        {revealed && (
          <div data-testid="chest-reveal" className="relative flex w-full flex-col items-center gap-3">
            <m.h2
              initial={reduced ? false : { opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="text-balance text-center font-neo-display text-[clamp(2.5rem,13vw,4rem)] font-black uppercase leading-[0.95]"
              style={{ color: rays.hex, textShadow: '4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' }}
            >
              {t(chestHeadlineKey(reveal.rarity))}
            </m.h2>
            <RewardChipRow label={t('economy.chest.chip.label')} chips={chips} reduced={reduced} delay={0.1} />
            {reveal.rank !== null && (
              <p className="inline-flex items-center gap-2 rounded-full border-2 border-white/25 bg-white/10 px-4 py-1.5 text-base font-bold">
                <Trophy aria-hidden="true" className="h-5 w-5 text-neo-yellow" />
                {t('economy.reward.rank', { rank: reveal.rank, size: reveal.size })}
              </p>
            )}
            <p className="text-sm font-bold text-neo-cyan">{t('economy.locker.added')}</p>
            <button
              type="button"
              autoFocus
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="min-h-14 w-full rounded-2xl border-[3px] border-black bg-neo-lime px-8 font-neo-display text-2xl font-black text-neo-navy shadow-hard-lg transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white active:scale-[0.97]"
            >
              {t('economy.chest.continue')}
            </button>
          </div>
        )}

        {(phase === 'sealed' || revealed) && (
          <ul aria-label={t('economy.chest.odds.label')} className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-white/60">
            {CHEST_RARITIES.map((r) => (
              <li key={r} className={r === reveal.rarity ? 'font-bold text-white' : undefined}>
                {`${t(`economy.chest.rarity.${r}`)} ${oddsLabel(r)}`}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CoinFlight count={coins} fromRef={chestRef} toSelector='[data-reward-landing="cash"] [data-reward-icon]' onDone={() => playCoinCascadeSound?.()} />
    </div>
  );
}
