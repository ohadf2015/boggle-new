'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface ScoreFloatProps {
  score: number
  overdrive: boolean
  isBingo: boolean
  encouragement: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ScoreFloat({ score, overdrive, isBingo, encouragement }: ScoreFloatProps) {
  const scoreRef = useRef<HTMLDivElement>(null)
  const encRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scoreRef.current) return
    const rm = prefersReducedMotion()
    // Reduced-motion: fade out in place instead of the 50 px upward float.
    gsap.fromTo(
      scoreRef.current,
      { y: 0, opacity: 1 },
      { y: rm ? 0 : -50, opacity: 0, duration: rm ? 0.4 : 0.9, ease: 'power1.out' },
    )
  }, [])

  useEffect(() => {
    if (!encRef.current || !encouragement) return
    const rm = prefersReducedMotion()
    gsap.fromTo(
      encRef.current,
      { y: 0, opacity: 1 },
      { y: rm ? 0 : -35, opacity: 0, duration: rm ? 0.4 : 1.2, delay: 0.15, ease: 'power1.out' },
    )
  }, [encouragement])

  const scoreColor = isBingo ? '#FFE135' : overdrive ? '#BFFF00' : '#FFFFFF'

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10" aria-hidden>
      <div
        ref={scoreRef}
        className="font-neo-display font-black text-3xl drop-shadow-[2px_2px_0_#000]"
        style={{ color: scoreColor }}
      >
        +{score}
      </div>
      {encouragement && (
        <div
          ref={encRef}
          className="font-neo-body text-sm text-neo-white drop-shadow-[1px_1px_0_#000] mt-1"
        >
          {encouragement}
        </div>
      )}
    </div>
  )
}
