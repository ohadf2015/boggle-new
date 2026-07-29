'use client'
import { useEffect, useRef } from 'react'
import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import gsap from 'gsap'

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
}

function buildDots(cycleStart: string, completedDates: string[], today: string): Dot[] {
  const completed = new Set(completedDates)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(cycleStart + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const label = new Date(iso + 'T00:00:00Z').toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })
    const filled = completed.has(iso)
    // ISO date strings sort lexicographically — direct string compare is safe.
    const missed = !filled && iso < today
    return { iso, label, filled, missed }
  })
}

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function ChestProgressDots({ completedDates, cycleStart, today }: Props) {
  const dotsRef = useRef<(HTMLDivElement | null)[]>([])
  const resolvedToday = today ?? todayUtcIso()
  const dots = buildDots(cycleStart, completedDates, resolvedToday)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = dotsRef.current.filter(Boolean) as HTMLDivElement[]
    if (els.length) {
      gsap.from(els, { scale: 0, opacity: 0, stagger: 0.08, duration: 0.4, ease: 'back.out(1.7)' })
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      {dots.map((dot, i) => (
        <div
          key={dot.iso}
          ref={el => { dotsRef.current[i] = el }}
          data-testid="dot"
          data-filled={dot.filled}
          data-missed={dot.missed}
          className="flex flex-col items-center gap-1"
        >
          {dot.filled ? (
            <CheckCircle2 className="w-6 h-6 text-neo-lime" />
          ) : dot.missed ? (
            <XCircle className="w-6 h-6 text-neo-red/80" />
          ) : (
            <Circle className="w-6 h-6 text-neo-white" />
          )}
          <span className="text-[10px] text-neo-white font-bold uppercase">{dot.label}</span>
        </div>
      ))}
    </div>
  )
}
