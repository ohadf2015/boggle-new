'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Coins, Award, X, Snowflake } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import gsap from 'gsap'
import type { PendingChest } from '@/hooks/useWeeklyChest'

const CHEST_IMAGES: Record<string, string> = {
  bronze: '/daily/chests/chest-bronze.jpg',
  silver: '/daily/chests/chest-silver.jpg',
  gold:   '/daily/chests/chest-gold.jpg',
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'text-amber-500',
  silver: 'text-slate-300',
  gold:   'text-neo-yellow',
}

const SOUNDS = {
  shake:   '/sounds/earthquake-shake.mp3',
  open:    '/sounds/chest-open.mp3',
  coins:   '/sounds/coin-cascade.mp3',
  fanfare: '/sounds/victory-fanfare.mp3',
} as const

function playSound(src: string) {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const a = new Audio(src)
  a.volume = 0.45
  a.play().catch(() => {})
}

interface Props {
  chest: PendingChest
  onClose: () => void
}

export default function WeeklyChestModal({ chest, onClose }: Props) {
  const { t } = useLanguage()
  const chestRef = useRef<HTMLImageElement>(null)
  const raysRef = useRef<HTMLDivElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)
  const [canClose, setCanClose] = useState(false)
  const [coinCount, setCoinCount] = useState(0)

  const tierKey = chest.tier.charAt(0).toUpperCase() + chest.tier.slice(1)
  const tierLabel = t(`daily.weeklyChest.tier${tierKey}`)

  useEffect(() => {
    if (typeof window === 'undefined') { setCanClose(true); setCoinCount(chest.coins); return }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) { setCanClose(true); setCoinCount(chest.coins); return }

    playSound(SOUNDS.shake)

    const tl = gsap.timeline()

    // Act 1 — shake/suspense (0–1.2s)
    tl.to(chestRef.current, { rotation: 5, duration: 0.12, yoyo: true, repeat: 6, ease: 'none' })

    // Act 2 — burst + coins (1.2–2.0s)
    .add(() => playSound(SOUNDS.open))
    .to(chestRef.current, { y: -200, rotation: -45, opacity: 0, duration: 0.5, ease: 'power2.out' })
    .fromTo(raysRef.current, { scale: 0, opacity: 0.8 }, { scale: 3, opacity: 0, duration: 0.6 }, '<')
    .add(() => playSound(SOUNDS.coins), '-=0.3')

    // Act 3 — reveal (2.0–3.5s)
    .add(() => {
      playSound(SOUNDS.fanfare)
      let n = 0
      const step = Math.ceil(chest.coins / 30)
      const id = setInterval(() => {
        n = Math.min(n + step, chest.coins)
        setCoinCount(n)
        if (n >= chest.coins) clearInterval(id)
      }, 40)
    })
    .from(revealRef.current!.children, { scale: 0, ease: 'back.out(1.7)', stagger: 0.2, duration: 0.5 })
    .add(() => setCanClose(true))

    return () => { tl.kill() }
  }, [chest.coins])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('daily.weeklyChest.title')}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neo-navy/90"
    >
      <div className="relative flex flex-col items-center gap-6 p-8 max-w-sm w-full">
        <div
          ref={raysRef}
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,225,53,0.12) 20deg, transparent 40deg, rgba(255,225,53,0.12) 60deg, transparent 80deg, rgba(255,225,53,0.12) 100deg, transparent 120deg, rgba(255,225,53,0.12) 140deg, transparent 160deg, rgba(255,225,53,0.12) 180deg, transparent 200deg, rgba(255,225,53,0.12) 220deg, transparent 240deg, rgba(255,225,53,0.12) 260deg, transparent 280deg, rgba(255,225,53,0.12) 300deg, transparent 320deg, rgba(255,225,53,0.12) 340deg, transparent 360deg)' }}
        />

        <Image
          ref={chestRef}
          src={CHEST_IMAGES[chest.tier]}
          alt={`${chest.tier} chest`}
          width={160}
          height={160}
          className="relative z-10"
          unoptimized
        />

        <div ref={revealRef} className="flex flex-col items-center gap-4 relative z-10">
          <div className="flex items-center gap-2">
            <Coins className={cn('w-9 h-9', TIER_COLORS[chest.tier])} />
            <span className={cn('font-neo-display font-black text-5xl tabular-nums', TIER_COLORS[chest.tier])}>
              +{coinCount}
            </span>
          </div>

          {chest.freezes && chest.freezes > 0 ? (
            <div
              data-testid="chest-freeze-bonus"
              className="flex items-center gap-2 px-3 py-1.5 rounded-neo border-2 border-neo-black bg-neo-cyan/15 shadow-hard-sm"
            >
              <Snowflake className="w-5 h-5 text-neo-cyan" />
              <span className="font-neo-display font-black text-sm text-neo-cyan">
                {t('daily.weeklyChest.freezesGranted', { n: chest.freezes }).replace('{n}', String(chest.freezes))}
              </span>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <Award className={cn('w-6 h-6', TIER_COLORS[chest.tier])} />
            <Image
              src={`/badges/weekly/badge-weekly-${chest.tier}.jpg`}
              alt={`${chest.tier} badge`}
              width={48}
              height={48}
              className="rounded-full border-2 border-neo-black shadow-hard"
              unoptimized
            />
          </div>

          {chest.labelKey ? (
            <p
              data-testid="chest-prize-label"
              className="font-neo-display font-black text-base text-neo-cream uppercase tracking-wider"
            >
              {t(chest.labelKey)}
            </p>
          ) : null}

          <p className={cn('font-neo-display font-black text-lg uppercase tracking-wider', TIER_COLORS[chest.tier])}>
            {tierLabel}
          </p>
        </div>

        {canClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-neo-cream/50 hover:text-neo-cream text-sm font-bold mt-2 relative z-10"
          >
            <X className="w-4 h-4" />
            {t('common.tapToContinue')}
          </button>
        )}
      </div>
    </div>
  )
}
