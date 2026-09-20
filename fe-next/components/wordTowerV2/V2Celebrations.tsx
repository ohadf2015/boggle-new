import { useEffect, useState } from 'react';
import { Medal, Sparkles, Trophy } from 'lucide-react';
import { ACHIEVEMENTS, type Tier } from '@/lib/wordTowerV2/achievements';
import type { Banner } from '@/lib/wordTowerV2/celebrations';
import type { RewardId } from '@/lib/wordTowerV2/rewards';
import type { CalloutEvent } from './useTowerRun';
import { REWARD_ICON, TONE_CLASS } from './v2Icons';

type T = (key: string, params?: Record<string, string | number>) => string;

const CALLOUT_MS = 1100;
const BANNER_MS = 2200;

const TIER_CLASS: Record<Tier, string> = {
  bronze: 'bg-neo-orange',
  silver: 'bg-neo-cream',
  gold: 'bg-neo-yellow',
};

interface Props {
  t: T;
  callout: CalloutEvent | null;
  /** Priority queue from the run; only the head is ever on screen. */
  banners: Banner[];
  onBannerDone: () => void;
}

/**
 * Two lanes, never a stack: the CALLOUT (landing verdict, combo, big word) is
 * short and the newest wins; the BANNER (crate, new sky, new best, badge) shows
 * the queue's head for a beat, then asks for the next. Round 5 ran four
 * independent toasts in one column and they piled up over the tower.
 */
export function V2Celebrations({ t, callout, banners, onBannerDone }: Props) {
  const [shown, setShown] = useState<CalloutEvent | null>(null);
  useEffect(() => {
    // A reset (callout -> null) must clear too, or the last one sticks.
    setShown(callout);
    if (!callout) return;
    const id = window.setTimeout(() => setShown(null), CALLOUT_MS);
    return () => window.clearTimeout(id);
  }, [callout]);

  const head = banners[0] ?? null;
  const headKey = head?.key;
  useEffect(() => {
    if (headKey === undefined) return;
    const id = window.setTimeout(onBannerDone, BANNER_MS);
    return () => window.clearTimeout(id);
  }, [headKey, onBannerDone]);

  return (
    <>
      {/* Callout in the drop gap the eye is on — BELOW the streak meter (which
          owns the top of the play area); at top-20% the two used to overlap. */}
      <div className="pointer-events-none absolute inset-x-0 top-[27%] z-20 flex justify-center px-4" aria-live="polite">
        {shown ? (
          <div
            key={shown.key}
            className={`flex items-baseline gap-2 rounded-neo border-neo-thick border-black px-4 py-1 font-neo-display text-xl font-black uppercase shadow-hard animate-neo-pop lg:text-3xl ${TONE_CLASS[shown.tone]}`}
          >
            <span>{t(shown.textKey, shown.params)}</span>
          </div>
        ) : null}
      </div>
      {/* Banners sit just above the dock, over the tower's base — never over
          the HUD, the hook or the tower top where the next drop lands. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--wt2-dock,17rem)+0.75rem)] z-20 flex justify-center px-4" aria-live="polite">
        {head ? <BannerCard key={head.key} t={t} banner={head} /> : null}
      </div>
    </>
  );
}

function BannerCard({ t, banner }: { t: T; banner: Banner }) {
  if (banner.kind === 'reward') {
    const Icon = REWARD_ICON[banner.id as RewardId];
    return (
      <div className="flex max-w-sm items-center gap-3 rounded-neo border-neo-thick border-black bg-neo-yellow px-4 py-2 text-neo-navy shadow-hard-lg animate-neo-pop">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <span className="flex flex-col text-start">
          <span className="font-neo-display text-[10px] font-black uppercase tracking-widest">{t('wordTowerV2.reward.crate')}</span>
          <span className="font-neo-display text-xl font-black leading-tight">{t(`wordTowerV2.reward.${banner.id}.name`)}</span>
          <span className="font-neo-body text-xs font-semibold leading-snug">{t(`wordTowerV2.reward.${banner.id}.desc`)}</span>
        </span>
      </div>
    );
  }
  if (banner.kind === 'achievement') {
    const tier = ACHIEVEMENTS.find((a) => a.id === banner.id)?.tier ?? 'bronze';
    return (
      <div className="flex max-w-sm items-center gap-3 rounded-neo border-neo-thick border-black bg-neo-purple px-4 py-2 text-neo-navy shadow-hard-lg animate-neo-pop">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-neo-thick border-black ${TIER_CLASS[tier]}`}>
          <Medal className="h-6 w-6" aria-hidden />
        </span>
        <span className="flex flex-col text-start">
          <span className="font-neo-display text-[10px] font-black uppercase tracking-widest">{t('wordTowerV2.ach.unlocked')}</span>
          <span className="font-neo-display text-xl font-black leading-tight">{t(`wordTowerV2.ach.${banner.id}.name`)}</span>
          <span className="font-neo-body text-xs font-semibold leading-snug">{t(`wordTowerV2.ach.${banner.id}.desc`)}</span>
        </span>
      </div>
    );
  }
  if (banner.kind === 'best') {
    return (
      <div className="flex items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-yellow px-5 py-1.5 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard-lg animate-neo-pop">
        <Trophy className="h-6 w-6" aria-hidden />
        {t('wordTowerV2.newBest')}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center rounded-neo border-neo-thick border-black bg-neo-cyan px-5 py-1.5 text-neo-navy shadow-hard-lg animate-neo-pop">
      <span className="flex items-center gap-1 font-neo-display text-[10px] font-black uppercase tracking-widest">
        <Sparkles className="h-3 w-3" aria-hidden />
        {t('wordTowerV2.newSky')}
      </span>
      <span className="font-neo-display text-2xl font-black">{t(`wordTowerV2.biome.${banner.id}`)}</span>
    </div>
  );
}
