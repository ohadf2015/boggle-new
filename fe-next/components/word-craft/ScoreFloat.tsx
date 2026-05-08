'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface ScoreFloatProps {
  score: number
  overdrive: boolean
  isBingo: boolean
  encouragement: string
}

export function ScoreFloat({ score, overdrive, isBingo, encouragement }: ScoreFloatProps) {
  const scoreRef = useRef<HTMLDivElement>(null)
  const encRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scoreRef.current) return
    gsap.fromTo(
      scoreRef.current,
      { y: 0, opacity: 1 },
      { y: -50, opacity: 0, duration: 0.9, ease: 'power1.out' },
    )
  }, [])

  useEffect(() => {
    if (!encRef.current || !encouragement) return
    gsap.fromTo(
      encRef.current,
      { y: 0, opacity: 1 },
      { y: -35, opacity: 0, duration: 1.2, delay: 0.15, ease: 'power1.out' },
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
