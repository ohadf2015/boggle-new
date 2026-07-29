'use client'
import { Trophy, Zap, Gauge, Target, Flame, TrendingUp } from 'lucide-react'
import { m } from 'framer-motion'
import { cn } from '@/lib/utils'

const ICONS = { Trophy, Zap, Gauge, Target, Flame, TrendingUp } as const
export type InsightIcon = keyof typeof ICONS

const TYPE_STYLE: Record<
  string,
  { bg: string; border: string; icon: string }
> = {
  personal_best: {
    bg: 'bg-neo-yellow/10',
    border: 'border-neo-yellow/40',
    icon: 'text-neo-yellow',
  },
  percentile: {
    bg: 'bg-neo-cyan/10',
    border: 'border-neo-cyan/40',
    icon: 'text-neo-cyan',
  },
  speed: {
    bg: 'bg-neo-pink/10',
    border: 'border-neo-pink/40',
    icon: 'text-neo-pink',
  },
  first_try: {
    bg: 'bg-neo-lime/10',
    border: 'border-neo-lime/40',
    icon: 'text-neo-lime',
  },
  streak_complete: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    icon: 'text-amber-400',
  },
  improved: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    icon: 'text-emerald-400',
  },
}

interface InsightCardProps {
  type: string
  headline: string
  sub: string
  lucideIcon: InsightIcon
  index?: number
}

export default function InsightCard({
  type,
  headline,
  sub,
  lucideIcon,
  index = 0,
}: InsightCardProps) {
  const Icon = ICONS[lucideIcon] ?? Trophy
  const style = TYPE_STYLE[type] ?? TYPE_STYLE.improved

  return (
    <m.div
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{
        delay: index * 0.15,
        type: 'spring',
        stiffness: 320,
        damping: 24,
      }}
      className={cn(
        'flex-shrink-0 w-44 rounded-neo border-2 p-3 shadow-hard',
        style.bg,
        style.border
      )}
    >
      <m.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: index * 0.15 + 0.1,
          type: 'spring',
          stiffness: 400,
          damping: 12,
        }}
        className={cn('mb-2', style.icon)}
      >
        <Icon className="w-5 h-5" />
      </m.div>
      <p className="font-neo-display font-black text-sm text-neo-white leading-tight">
        {headline}
      </p>
      <p className="text-xs text-neo-white mt-0.5 leading-tight">{sub}</p>
    </m.div>
  )
}
