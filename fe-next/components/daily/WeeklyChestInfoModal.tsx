'use client'
import Image from 'next/image'
import { X, Calendar, AlertTriangle, TrendingUp } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { ChestTier } from '@/hooks/useWeeklyChest'

const CHEST_IMG: Record<ChestTier, string> = {
  bronze: '/daily/chests/chest-bronze.jpg',
  silver: '/daily/chests/chest-silver.jpg',
  gold: '/daily/chests/chest-gold.jpg',
}

const TIER_TEXT: Record<ChestTier, string> = {
  bronze: 'text-amber-500',
  silver: 'text-slate-300',
  gold: 'text-neo-yellow',
}

const TIERS: { tier: ChestTier; descKey: string }[] = [
  { tier: 'bronze', descKey: 'daily.weeklyChest.info.tierBronzeDesc' },
  { tier: 'silver', descKey: 'daily.weeklyChest.info.tierSilverDesc' },
  { tier: 'gold', descKey: 'daily.weeklyChest.info.tierGoldDesc' },
]

interface Props {
  projectedTier: ChestTier
  weekScore: number
  onClose: () => void
}

export default function WeeklyChestInfoModal({ projectedTier, weekScore, onClose }: Props) {
  const { t } = useLanguage()
  const tierLabel = t(
    `daily.weeklyChest.tier${projectedTier.charAt(0).toUpperCase() + projectedTier.slice(1)}`,
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('daily.weeklyChest.info.title')}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neo-navy/90 p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute top-3 end-3 w-8 h-8 flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-navy text-neo-white hover:text-neo-white shadow-hard-xs"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="font-neo-display font-black text-lg text-neo-white uppercase tracking-wider pe-8">
          {t('daily.weeklyChest.info.title')}
        </h2>

        <div className="flex items-start gap-2.5">
          <Calendar className="w-5 h-5 text-neo-cyan shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-neo-white font-bold leading-snug">
            {t('daily.weeklyChest.info.howItWorks')}
          </p>
        </div>

        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-neo-orange shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-neo-white font-bold leading-snug">
            {t('daily.weeklyChest.info.streakReset')}
          </p>
        </div>

        <div className="rounded-neo border-2 border-neo-black bg-neo-navy p-3 flex flex-col gap-3">
          <span className="font-neo-display font-black text-xs text-neo-white uppercase tracking-wider">
            {t('daily.weeklyChest.info.tiersTitle')}
          </span>
          {TIERS.map(({ tier, descKey }) => (
            <div key={tier} className="flex items-center gap-3">
              <Image
                src={CHEST_IMG[tier]}
                alt={t(`daily.weeklyChest.tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`)}
                width={40}
                height={40}
                className="rounded-lg border-2 border-neo-black shadow-hard-xs shrink-0"
                unoptimized
              />
              <div className="min-w-0">
                <span
                  className={cn(
                    'font-neo-display font-black text-xs uppercase tracking-wider',
                    TIER_TEXT[tier],
                  )}
                >
                  {t(`daily.weeklyChest.tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`)}
                </span>
                <p className="text-xs text-neo-white font-bold leading-snug">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2.5">
          <TrendingUp className="w-5 h-5 text-neo-lime shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-neo-white font-bold leading-snug">
            {t('daily.weeklyChest.info.betterChest')}
          </p>
        </div>

        <p
          data-testid="chest-info-projection"
          className="text-sm font-black text-center rounded-neo border-2 border-neo-black bg-neo-navy py-2 px-3"
        >
          <span className="text-neo-white">{t('daily.weeklyChest.info.projection')}</span>{' '}
          <span className={cn('uppercase', TIER_TEXT[projectedTier])}>{tierLabel}</span>
          <span className="ms-1 text-neo-white">({weekScore}/100)</span>
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-navy font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed active:translate-y-px"
        >
          {t('daily.weeklyChest.info.gotIt')}
        </button>
      </div>
    </div>
  )
}
