'use client'
import { useEffect, useRef } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import gsap from 'gsap'

interface Props {
  completedDates: string[]
  cycleStart: string
}

function buildDots(cycleStart: string, completedDates: string[]) {
  const completed = new Set(completedDates)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(cycleStart + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const label = new Date(iso + 'T00:00:00Z').toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })
    return { iso, label, filled: completed.has(iso) }
  })
}

export default function ChestProgressDots({ completedDates, cycleStart }: Props) {
  const dotsRef = useRef<(HTMLDivElement | null)[]>([])
  const dots = buildDots(cycleStart, completedDates)

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
          className="flex flex-col items-center gap-1"
        >
          {dot.filled
            ? <CheckCircle2 className="w-6 h-6 text-neo-lime" />
            : <Circle className="w-6 h-6 text-neo-white/30" />
          }
          <span className="text-[10px] text-neo-cream/50 font-bold uppercase">{dot.label}</span>
        </div>
      ))}
    </div>
  )
}
