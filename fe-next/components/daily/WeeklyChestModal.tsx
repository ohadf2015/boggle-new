'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Coins, Award, X, Snowflake, Sparkles } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import gsap from 'gsap'
import { triggerHaptic } from '@/utils/hapticFeedback'
import { getAssetUrl } from '@/lib/assets/cdn'
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

// Tier-specific glow halo (rgba so we can blend into a radial-gradient).
const TIER_HALO: Record<string, string> = {
  bronze: 'rgba(245,158,11,0.35)',  // amber-500
  silver: 'rgba(203,213,225,0.30)', // slate-300
  gold:   'rgba(255,225,53,0.45)',  // neo-yellow
}

const SOUNDS = {
  shake:   '/sounds/earthquake-shake.mp3',
  open:    '/sounds/chest-open.mp3',
  coins:   '/sounds/coin-cascade.mp3',
  fanfare: '/sounds/victory-fanfare.mp3',
  ping:    '/sounds/xp-sparkle.mp3',
} as const

// Per-sound volumes — shake stays quiet so it doesn't drown the fanfare;
// fanfare gets pushed up because it's the celebratory peak.
function playSound(src: string, volume = 0.5) {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const a = new Audio(getAssetUrl(src))
  a.volume = Math.max(0, Math.min(1, volume))
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
  const haloRef = useRef<HTMLDivElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)
  const coinNumberRef = useRef<HTMLSpanElement>(null)
  const [canClose, setCanClose] = useState(false)
  const [coinCount, setCoinCount] = useState(0)

  const tierKey = chest.tier.charAt(0).toUpperCase() + chest.tier.slice(1)
  const tierLabel = t(`daily.weeklyChest.tier${tierKey}`)
  const freezes = chest.freezes ?? 0
  const freezeKey = freezes === 1
    ? 'daily.weeklyChest.freezesGranted'
    : 'daily.weeklyChest.freezesGrantedPlural'

  useEffect(() => {
    if (typeof window === 'undefined') { setCanClose(true); setCoinCount(chest.coins); return }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) { setCanClose(true); setCoinCount(chest.coins); return }

    let counterInterval: ReturnType<typeof setInterval> | null = null

    playSound(SOUNDS.shake, 0.35)

    const tl = gsap.timeline()

    // Act 1 — shake/suspense (0–0.84s)
    tl.to(chestRef.current, { rotation: 5, duration: 0.12, yoyo: true, repeat: 6, ease: 'none' })

    // Act 2 — burst + coins (0.84–1.44s)
    .add(() => {
      playSound(SOUNDS.open, 0.75)
      triggerHaptic('heavy')
    })
    .to(chestRef.current, { y: -200, rotation: -45, opacity: 0, duration: 0.5, ease: 'power2.out' })
    .fromTo(raysRef.current, { scale: 0, opacity: 0.85 }, { scale: 3, opacity: 0, duration: 0.6 }, '<')
    // Fade the persistent tier halo in as the chest opens — fills the void
    // the chest leaves so the reveal doesn't sit on dead space.
    .fromTo(haloRef.current, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }, '<')
    .add(() => playSound(SOUNDS.coins, 0.6), '-=0.3')

    // Act 3 — reveal (1.44s onward)
    .add(() => playSound(SOUNDS.fanfare, 0.85))
    .from(revealRef.current!.children, { scale: 0, ease: 'back.out(1.7)', stagger: 0.18, duration: 0.45 })
    // Start the coin counter slightly after the reveal stagger begins so the
    // number is already visible when it starts ticking.
    .add(() => {
      let n = 0
      const step = Math.max(1, Math.ceil(chest.coins / 30))
      counterInterval = setInterval(() => {
        n = Math.min(n + step, chest.coins)
        setCoinCount(n)
        if (n >= chest.coins) {
          if (counterInterval) { clearInterval(counterInterval); counterInterval = null }
          // Punch the number for a satisfying finish + soft ping.
          if (coinNumberRef.current) {
            gsap.fromTo(
              coinNumberRef.current,
              { scale: 1.25 },
              { scale: 1, duration: 0.35, ease: 'back.out(2)' }
            )
          }
          playSound(SOUNDS.ping, 0.5)
          triggerHaptic('success')
        }
      }, 40)
    }, '-=0.6')
    .add(() => setCanClose(true), '+=0.4')

    return () => {
      tl.kill()
      if (counterInterval) clearInterval(counterInterval)
    }
  }, [chest.coins])

  // Close on Escape — only after the reveal is done.
  useEffect(() => {
    if (!canClose) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canClose, onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canClose) return
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('daily.weeklyChest.title')}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neo-navy/85 backdrop-blur-md"
    >
      <div className="relative flex flex-col items-center gap-5 p-8 max-w-sm w-full">
        {/* Persistent tier-colored halo behind the rewards — fades in during burst, stays. */}
        <div
          ref={haloRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            opacity: 0,
            background: `radial-gradient(circle at 50% 45%, ${TIER_HALO[chest.tier]} 0%, transparent 65%)`,
          }}
        />

        {/* Burst rays — momentary explosion when the chest opens. */}
        <div
          ref={raysRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none rounded-full"
          style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,225,53,0.14) 20deg, transparent 40deg, rgba(255,225,53,0.14) 60deg, transparent 80deg, rgba(255,225,53,0.14) 100deg, transparent 120deg, rgba(255,225,53,0.14) 140deg, transparent 160deg, rgba(255,225,53,0.14) 180deg, transparent 200deg, rgba(255,225,53,0.14) 220deg, transparent 240deg, rgba(255,225,53,0.14) 260deg, transparent 280deg, rgba(255,225,53,0.14) 300deg, transparent 320deg, rgba(255,225,53,0.14) 340deg, transparent 360deg)' }}
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

        <div ref={revealRef} className="flex flex-col items-center gap-3 relative z-10">
          {/* Tier subtitle */}
          <p className={cn('font-neo-display font-black text-xs uppercase tracking-[0.2em] opacity-80', TIER_COLORS[chest.tier])}>
            {tierLabel} {t('daily.weeklyChest.title')}
          </p>

          {/* Prize hero name */}
          {chest.labelKey ? (
            <p
              data-testid="chest-prize-label"
              className="font-neo-display font-black text-2xl text-neo-white uppercase tracking-wider text-center leading-tight"
            >
              {t(chest.labelKey)}
            </p>
          ) : null}

          {/* Coin count — punch animates at end of tick */}
          <div className="flex items-center gap-2 mt-1">
            <Coins className={cn('w-9 h-9', TIER_COLORS[chest.tier])} />
            <span
              ref={coinNumberRef}
              className={cn(
                'font-neo-display font-black text-5xl tabular-nums origin-center',
                TIER_COLORS[chest.tier]
              )}
            >
              +{coinCount}
            </span>
          </div>

          {/* Freeze chip (only if granted) */}
          {freezes > 0 ? (
            <div
              data-testid="chest-freeze-bonus"
              className="flex items-center gap-2 px-3 py-1.5 rounded-neo border-2 border-neo-black bg-neo-cyan/15 shadow-hard-sm"
            >
              <Snowflake className="w-5 h-5 text-neo-cyan" />
              <span className="font-neo-display font-black text-sm text-neo-cyan">
                {t(freezeKey).replace('{n}', String(freezes))}
              </span>
            </div>
          ) : null}

          {/* Badge medallion */}
          <div className="flex items-center gap-3 mt-1 opacity-90">
            <Award className={cn('w-5 h-5', TIER_COLORS[chest.tier])} />
            <Image
              src={`/badges/weekly/badge-weekly-${chest.tier}.jpg`}
              alt={`${chest.tier} badge`}
              width={44}
              height={44}
              className="rounded-full border-2 border-neo-black shadow-hard"
              unoptimized
            />
          </div>
        </div>

        {/* aria-live announcement so screen readers hear the prize once it's revealed. */}
        <div className="sr-only" aria-live="polite">
          {canClose
            ? `${tierLabel} ${t('daily.weeklyChest.title')} — ${chest.labelKey ? t(chest.labelKey) + ', ' : ''}+${chest.coins} coins${freezes > 0 ? `, +${freezes} streak ${freezes === 1 ? 'freeze' : 'freezes'}` : ''}`
            : ''}
        </div>

        {canClose && (
          <button
            type="button"
            data-testid="chest-continue-button"
            onClick={onClose}
            autoFocus
            className="mt-3 flex items-center gap-1.5 px-5 py-2 rounded-neo border-2 border-black bg-neo-yellow text-neo-navy font-neo-display font-black text-sm shadow-hard active:shadow-hard-pressed active:translate-y-px relative z-10 uppercase tracking-wider"
          >
            <Sparkles className="w-4 h-4" />
            {t('common.tapToContinue')}
          </button>
        )}

        {/* Small dismiss "x" — also gated on canClose for symmetry with Escape/backdrop. */}
        {canClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.tapToContinue')}
            className="absolute top-2 end-2 p-1 rounded-full text-neo-white hover:text-neo-white z-10"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
