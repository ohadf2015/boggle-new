'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { cn } from '@/lib/utils'

interface HeatMeterProps {
  heat: number          // 0–100
  overdrive: boolean
  burnout: boolean
  label: string         // i18n: t('wordcraft.heatLabel')
}

export function HeatMeter({ heat, overdrive, burnout, label }: HeatMeterProps) {
  const fillRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pulseRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    if (!fillRef.current) return
    const color =
      heat >= 100 ? '#FFE135'   // gold overdrive
      : heat >= 85 ? '#FF3333'  // red danger
      : heat >= 60 ? '#FF6B35'  // orange warning
      : '#BFFF00'               // lime normal

    gsap.to(fillRef.current, {
      width: `${heat}%`,
      backgroundColor: color,
      duration: 0.4,
      ease: 'power2.out',
    })

    if (overdrive && !pulseRef.current) {
      pulseRef.current = gsap.to(fillRef.current, {
        scaleY: 1.1,
        yoyo: true,
        repeat: -1,
        duration: 0.45,
        ease: 'sine.inOut',
      })
    } else if (!overdrive && pulseRef.current) {
      pulseRef.current.kill()
      pulseRef.current = null
      gsap.set(fillRef.current, { scaleY: 1 })
    }
  }, [heat, overdrive])

  useEffect(() => {
    if (!burnout || !containerRef.current) return
    gsap.to(containerRef.current, {
      x: -5,
      duration: 0.05,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(containerRef.current, { x: 5, duration: 0.05 })
        gsap.to(containerRef.current, { x: -5, duration: 0.05, delay: 0.1 })
        gsap.to(containerRef.current, { x: 5, duration: 0.05, delay: 0.15 })
        gsap.to(containerRef.current, { x: 0, duration: 0.05, delay: 0.2 })
      },
    })
  }, [burnout])

  return (
    <div ref={containerRef} className="w-full" aria-label={`${label}: ${heat}%`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-neo-display uppercase tracking-widest text-neo-white/60">
          {label}
        </span>
        {overdrive && (
          <span className="text-[10px] font-neo-display font-black text-neo-yellow animate-pulse uppercase tracking-widest">
            OVERDRIVE!
          </span>
        )}
        {burnout && !overdrive && (
          <span className="text-[10px] font-neo-display font-black text-red-400 uppercase tracking-widest">
            BURNED OUT
          </span>
        )}
      </div>
      <div className="relative h-3 bg-neo-navy-light border-2 border-black rounded-sm overflow-hidden">
        <div
          ref={fillRef}
          className={cn(
            'absolute left-0 top-0 h-full rounded-sm origin-left',
            overdrive && 'shadow-[0_0_8px_rgba(255,225,53,0.8)]',
          )}
          style={{ width: `${heat}%`, backgroundColor: '#BFFF00' }}
        />
      </div>
    </div>
  )
}
