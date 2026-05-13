'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { Calendar, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useWeeklyChest, type PendingChest } from '@/hooks/useWeeklyChest'
import ChestProgressDots from './ChestProgressDots'
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
    claim,
  } = useWeeklyChest()
  const chestRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

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

  const tier: 'bronze' | 'silver' | 'gold' = pendingChest?.tier ?? 'silver'
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
      <div className="flex items-center justify-between mb-3 relative">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neo-cream/60" />
          <span className="font-neo-display font-black text-sm text-neo-white uppercase tracking-wider">
            {t('daily.weeklyChest.title')}
          </span>
        </div>
        <span className="text-xs text-neo-cream/50 font-bold">
          {t('daily.weeklyChest.dayProgress').replace('{day}', String(daysCompleted))}
        </span>
      </div>

      <div className="flex items-center gap-3 relative">
        {cycleStart && (
          <ChestProgressDots
            completedDates={completedDates}
            cycleStart={cycleStart}
          />
        )}
        <div ref={chestRef} className="ms-auto relative">
          <Image
            src={CHEST_IMG[tier]}
            alt={tierLabel}
            data-testid="chest-tier-thumb"
            width={56}
            height={56}
            className="rounded-md border-2 border-neo-black shadow-hard-sm"
            unoptimized
          />
          {isClaimable && (
            <Sparkles
              aria-hidden="true"
              className="absolute -top-2 -end-2 w-4 h-4 text-neo-yellow drop-shadow"
            />
          )}
        </div>
      </div>

      <p className="text-xs text-neo-cream/50 mt-2">
        {isClaimable
          ? t('daily.weeklyChest.claimReady')
              .replace('{tier}', tierLabel)
          : t('daily.weeklyChest.daysRemaining')
              .replace('{n}', String(7 - daysCompleted))
              .replace('{tier}', tierLabel)}
      </p>

      <AnimatePresence>
        {isClaimable && (
          <motion.button
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={handleClaim}
            className="mt-3 w-full py-2 rounded-neo border-2 border-black bg-neo-yellow text-neo-navy font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed active:translate-y-px"
          >
            {t('daily.weeklyChest.claimButton')}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
