'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import gsap from 'gsap'
import { useLanguage } from '@/contexts/LanguageContext'
import { resolveMissedDayAction, type MissedDayAction } from '@/utils/dailyChallenge/missedDayAction'

interface Props {
  completedDates: string[]
  cycleStart: string
  /** ISO date (YYYY-MM-DD). Defaults to today (UTC). Past+unfilled days within
   *  the cycle render as missed (X); today/future days stay pending. */
  today?: string
}

interface Dot {
  iso: string
  label: string
  filled: boolean
  missed: boolean
  action: MissedDayAction
}

function buildDots(cycleStart: string, completedDates: string[], today: string, language: string): Dot[] {
  const completed = new Set(completedDates)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(cycleStart + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const label = new Date(iso + 'T00:00:00Z').toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })
    const filled = completed.has(iso)
    // ISO date strings sort lexicographically — direct string compare is safe.
    const missed = !filled && iso < today
    const action = resolveMissedDayAction(
      { date: iso, wordHunt: filled, wordWheel: false },
      { today, language },
    )
    return { iso, label, filled, missed, action }
  })
}

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const DOT_CLASS = 'flex flex-col items-center gap-1'
const TAPPABLE_CLASS = `${DOT_CLASS} rounded-neo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan active:translate-y-px`

export default function ChestProgressDots({ completedDates, cycleStart, today }: Props) {
  const { t, language } = useLanguage()
  const dotsRef = useRef<(HTMLElement | null)[]>([])
  const resolvedToday = today ?? todayUtcIso()
  const dots = buildDots(cycleStart, completedDates, resolvedToday, language)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = dotsRef.current.filter(Boolean) as HTMLElement[]
    if (els.length) {
      gsap.from(els, { scale: 0, opacity: 0, stagger: 0.08, duration: 0.4, ease: 'back.out(1.7)' })
    }
  }, [])

  const labelFor = (dot: Dot): string => {
    const key =
      dot.action.kind === 'done' ? 'daily.catchUp.tileDone'
      : dot.action.kind === 'play' ? 'daily.catchUp.tileMissed'
      : dot.action.kind === 'today' ? 'daily.catchUp.tileToday'
      : dot.action.kind === 'expired' ? 'daily.catchUp.tileExpired'
      : 'daily.catchUp.tilePending'
    return `${dot.iso} · ${t(key)}`
  }

  return (
    <div className="flex items-center gap-2">
      {dots.map((dot, i) => {
        const icon = dot.filled ? (
          <CheckCircle2 className="w-6 h-6 text-neo-lime" />
        ) : dot.missed ? (
          <XCircle className={`w-6 h-6 ${dot.action.kind === 'play' ? 'text-neo-cyan' : 'text-neo-red/80'}`} />
        ) : (
          <Circle className="w-6 h-6 text-neo-white" />
        )
        const label = <span className="text-[10px] text-neo-white font-bold uppercase">{dot.label}</span>
        const common = {
          'data-testid': 'dot',
          'data-filled': dot.filled,
          'data-missed': dot.missed,
          'data-day-state': dot.action.kind,
          title: labelFor(dot),
        } as const
        // Done → that day's results; missed-in-window → catch-up play; today → hub.
        if ('href' in dot.action) {
          return (
            <Link
              key={dot.iso}
              href={dot.action.href}
              prefetch={false}
              aria-label={labelFor(dot)}
              ref={el => { dotsRef.current[i] = el }}
              className={TAPPABLE_CLASS}
              {...common}
            >
              {icon}
              {label}
            </Link>
          )
        }
        return (
          <div
            key={dot.iso}
            ref={el => { dotsRef.current[i] = el }}
            className={DOT_CLASS}
            {...common}
          >
            {icon}
            {label}
          </div>
        )
      })}
    </div>
  )
}
