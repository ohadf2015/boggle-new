'use client'
import { useEffect, useRef } from 'react'
import { Calendar, Lock, LockOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { useWeeklyChest, type PendingChest } from '@/hooks/useWeeklyChest'
import ChestProgressDots from './ChestProgressDots'
import { cn } from '@/lib/utils'
import gsap from 'gsap'

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
  const lockRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isClaimable || !lockRef.current) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const tween = gsap.to(lockRef.current, {
      scale: 1.08,
      yoyo: true,
      repeat: -1,
      duration: 0.8,
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

  const tier = pendingChest?.tier ?? 'silver'
  const tierLabel = t(
    `daily.weeklyChest.tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`
  )

  return (
    <div className="rounded-neo border-2 border-black bg-neo-navy-light shadow-hard p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
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

      <div className="flex items-center gap-3">
        {cycleStart && (
          <ChestProgressDots
            completedDates={completedDates}
            cycleStart={cycleStart}
          />
        )}
        <div ref={lockRef} className="ml-auto">
          {isClaimable ? (
            <LockOpen className="w-7 h-7 text-neo-yellow" />
          ) : (
            <Lock className="w-7 h-7 text-neo-white/40" />
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
