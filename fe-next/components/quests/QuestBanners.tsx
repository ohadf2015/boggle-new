'use client';

import { Puzzle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { getAssetUrl } from '@/lib/assets/cdn';
import { cn } from '@/lib/utils';

const POP_IN = {
  initial: { scale: 0.8, rotate: -2 },
  animate: { scale: 1, rotate: 0 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 13 },
};

function Sticker({ src, className }: { src: string; className?: string }) {
  return (
    <div className="relative grid size-18 shrink-0 place-items-center">
      <span
        className="absolute inset-1 rounded-neo border-3 border-neo-black bg-neo-yellow motion-safe:animate-[quest-burst_4s_linear_infinite]"
        aria-hidden="true"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- small pre-sized sticker */}
      <img src={getAssetUrl(src)} width={64} height={64} alt="" className={cn('relative size-16 object-contain', className)} />
    </div>
  );
}

export function GrandSlamBanner() {
  const { t } = useLanguage();
  return (
    <AdaptiveMotion.div
      {...POP_IN}
      className="flex items-center gap-4 rounded-neo-lg border-3 border-neo-black bg-neo-yellow p-4 shadow-hard"
      role="status"
      aria-live="polite"
    >
      <Sticker src="/quests/chest.webp" className="motion-safe:animate-[quest-chest-wobble_2.4s_ease-in-out_infinite]" />
      <div className="min-w-0 flex-1">
        <p className="font-neo-display text-xl font-black uppercase text-neo-black">{t('quests.grandSlam')}</p>
        <p className="font-neo-body text-sm font-bold text-neo-black">{t('quests.grandSlamBonus')}</p>
        <span className="mt-1 inline-flex items-center gap-1 rounded-neo-sm border-2 border-neo-black bg-neo-cyan px-1.5 py-px text-xs font-black text-neo-black">
          <Puzzle className="size-3" aria-hidden="true" />
          {t('quests.grandSlamAvatar')}
        </span>
      </div>
    </AdaptiveMotion.div>
  );
}

export function AllQuestsCompleteBanner() {
  const { t } = useLanguage();
  return (
    <AdaptiveMotion.div
      {...POP_IN}
      className="flex items-center gap-4 rounded-neo-lg border-3 border-neo-black bg-neo-lime p-4 shadow-hard-lg"
      role="status"
      aria-live="polite"
    >
      <Sticker src="/quests/crown.webp" className="motion-safe:animate-[quest-bob_2.4s_ease-in-out_infinite]" />
      <div className="min-w-0 flex-1">
        <p className="font-neo-display text-xl font-black uppercase text-neo-black">{t('quests.allComplete')}</p>
        <p className="font-neo-body text-sm font-bold text-neo-black">{t('quests.allCompleteDesc')}</p>
      </div>
    </AdaptiveMotion.div>
  );
}
