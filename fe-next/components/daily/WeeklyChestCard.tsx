'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Calendar, Sparkles, Info } from 'lucide-react'
import { m, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useWeeklyChest, type PendingChest } from '@/hooks/useWeeklyChest'
import ChestProgressDots from './ChestProgressDots'
import WeeklyChestInfoModal from './WeeklyChestInfoModal'
import gsap from 'gsap'

const CHEST_IMG: Record<'bronze' | 'silver' | 'gold', string> = {
  bronze: '/daily/chests/chest-bronze.jpg',
  silver: '/daily/chests/chest-silver.jpg',
  gold: '/daily/chests/chest-gold.jpg',
}

interface Props {
  onChestClaimed: (chest: PendingChest) => void
}

export default function WeeklyChestCard({ onChestClaimed }: Props) {
  const { t } = useLanguage()
  const {
    loading,
    daysCompleted,
    completedDates,
    cycleStart,
    isClaimable,
    pendingChest,
    projectedTier,
    weekScore,
    claim,
  } = useWeeklyChest()
  const chestRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  // Defensive: callers may receive partial / error payloads. Always render integers.
  const safeDays = Number.isFinite(daysCompleted)
    ? Math.max(0, Math.min(7, Math.trunc(daysCompleted)))
    : 0
  const remaining = Math.max(0, 7 - safeDays)
  const percent = Math.round((safeDays / 7) * 100)

  // Card entrance (one-shot)
  useEffect(() => {
    if (!cardRef.current) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    gsap.from(cardRef.current, {
      y: 16,
      opacity: 0,
      duration: 0.45,
      ease: 'back.out(1.4)',
    })
  }, [])

  // Animate progress bar fill on data change
  useEffect(() => {
    if (!barRef.current) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      barRef.current.style.width = `${percent}%`
      return
    }
    const tween = gsap.to(barRef.current, {
      width: `${percent}%`,
      duration: 0.6,
      ease: 'power2.out',
    })
    return () => { tween.kill() }
  }, [percent])

  // Idle float; intensifies when claimable
  useEffect(() => {
    if (!chestRef.current) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const tween = isClaimable
      ? gsap.to(chestRef.current, {
          scale: 1.12,
          y: -3,
          yoyo: true,
          repeat: -1,
          duration: 0.7,
          ease: 'sine.inOut',
        })
      : gsap.to(chestRef.current, {
          y: -2,
          yoyo: true,
          repeat: -1,
          duration: 1.6,
          ease: 'sine.inOut',
        })
    return () => {
      tween.kill()
    }
  }, [isClaimable])

  const handleClaim = async () => {
    const result = await claim()
    if (result) onChestClaimed(result)
  }

  if (loading) return null

  // Pre-claim, show the *projected* tier (what they'd get right now) instead of a
  // misleading hardcoded fallback. Once claimable, the real pending tier wins.
  const tier: 'bronze' | 'silver' | 'gold' = pendingChest?.tier ?? projectedTier ?? 'bronze'
  const tierLabel = t(
    `daily.weeklyChest.tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`
  )

  return (
    <div
      ref={cardRef}
      className="w-full rounded-neo border-2 border-black bg-neo-navy-light shadow-hard p-4 relative overflow-hidden"
    >
      {isClaimable && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at 85% 30%, rgba(255,225,53,0.18) 0%, transparent 55%)',
          }}
        />
      )}

      {/* Header: title + day counter pill */}
      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neo-white" />
          <span className="font-neo-display font-black text-sm text-neo-white uppercase tracking-wider">
            {t('daily.weeklyChest.title')}
          </span>
        </div>
        <span
          className="text-[11px] font-black text-neo-navy bg-neo-yellow rounded-full px-2.5 py-0.5 border-2 border-neo-black shadow-hard-xs"
          data-testid="chest-day-counter"
        >
          {safeDays}/7
        </span>
      </div>

      {/* Main row: chest + progress */}
      <div className="flex items-center gap-4 relative">
        <button
          ref={chestRef}
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label={t('daily.weeklyChest.info.title')}
          className="relative shrink-0 rounded-lg focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan"
        >
          <Image
            src={CHEST_IMG[tier]}
            alt={tierLabel}
            data-testid="chest-tier-thumb"
            width={72}
            height={72}
            className="rounded-lg border-2 border-neo-black shadow-hard-sm"
            unoptimized
          />
          {isClaimable && (
            <Sparkles
              aria-hidden="true"
              className="absolute -top-2 -end-2 w-5 h-5 text-neo-yellow drop-shadow"
            />
          )}
          <span
            aria-hidden="true"
            className="absolute -bottom-1.5 -end-1.5 w-5 h-5 rounded-full border-2 border-neo-black bg-neo-cyan flex items-center justify-center shadow-hard-xs"
          >
            <Info className="w-3 h-3 text-neo-navy" strokeWidth={3} />
          </span>
        </button>

        <div className="flex-1 min-w-0">
          {/* Progress bar */}
          <div
            className="relative h-3 w-full rounded-full bg-neo-navy border-2 border-neo-black overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={7}
            aria-valuenow={safeDays}
            aria-label={t('daily.weeklyChest.title')}
            data-testid="chest-progress-bar"
          >
            <div
              ref={barRef}
              className="absolute inset-y-0 start-0 bg-gradient-to-r from-neo-lime via-neo-cyan to-neo-yellow"
              style={{ width: '0%' }}
            />
          </div>

          {/* Status line: X of 7 + days remaining */}
          <p className="mt-2 text-xs text-neo-white font-bold">
            <span className="text-neo-white">
              {t('daily.weeklyChest.dayProgress').replace('{day}', String(safeDays))}
            </span>
            {!isClaimable && (
              <span className="ms-2 text-neo-white">
                · {t('daily.weeklyChest.daysRemaining')
                    .replace('{n}', String(remaining))
                    .replace('{tier}', tierLabel)}
              </span>
            )}
            {isClaimable && (
              <span className="ms-2 text-neo-yellow">
                · {t('daily.weeklyChest.claimReady').replace('{tier}', tierLabel)}
              </span>
            )}
          </p>

          {/* Day markers (kept as `chest-dots` testid for existing tests) */}
          {cycleStart && (
            <div className="mt-2">
              <ChestProgressDots
                completedDates={completedDates}
                cycleStart={cycleStart}
              />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isClaimable && (
          <m.button
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={handleClaim}
            className="mt-3 w-full py-2 rounded-neo border-2 border-black bg-neo-yellow text-neo-navy font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed active:translate-y-px"
          >
            {t('daily.weeklyChest.claimButton')}
          </m.button>
        )}
      </AnimatePresence>

      {infoOpen && (
        <WeeklyChestInfoModal
          projectedTier={tier}
          weekScore={weekScore}
          onClose={() => setInfoOpen(false)}
        />
      )}
    </div>
  )
}
