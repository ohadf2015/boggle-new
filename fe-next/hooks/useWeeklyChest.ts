'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

export interface PendingChest {
  tier: 'bronze' | 'silver' | 'gold'
  coins: number
  badgeId: string
  cycleNumber?: number
  // Prize-pool fields (server may omit on legacy chests; treat as optional).
  freezes?: number
  variantId?: string
  labelKey?: string
}

export type ChestTier = 'bronze' | 'silver' | 'gold'

export interface WeeklyChestState {
  loading: boolean
  daysCompleted: number
  /** Full consecutive-day streak (can exceed 7) — powers the daily "fire" icon. */
  currentStreak: number
  completedDates: string[]
  cycleStart: string
  cycleNumber: number
  isClaimable: boolean
  pendingChest: PendingChest | null
  /** Tier the chest would be if claimed right now, based on performance so far. */
  projectedTier: ChestTier
  /** 0-100 average performance score across this cycle's completed days. */
  weekScore: number
  claim: () => Promise<PendingChest | null>
  refresh: () => void
}

const DEFAULTS = {
  daysCompleted: 0,
  currentStreak: 0,
  completedDates: [] as string[],
  cycleStart: '',
  cycleNumber: 1,
  isClaimable: false,
  pendingChest: null as PendingChest | null,
  projectedTier: 'bronze' as ChestTier,
  weekScore: 0,
}

// Coerce server payloads (or error responses) into the strict shape the UI expects.
// Without this, an error response like `{ error: 'Unauthorized' }` would leak through
// and render `undefined` / `NaN` in the chest copy.
function normalizeStatus(json: unknown): typeof DEFAULTS {
  const obj = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>
  const rawDays = Number(obj.daysCompleted)
  const daysCompleted = Number.isFinite(rawDays)
    ? Math.max(0, Math.min(7, Math.trunc(rawDays)))
    : 0
  // currentStreak is the full consecutive run — NOT clamped to 7 (the fire icon
  // shows real streaks like "23"), only floored at 0 and integer-coerced.
  const rawStreak = Number(obj.currentStreak)
  const currentStreak = Number.isFinite(rawStreak) ? Math.max(0, Math.trunc(rawStreak)) : 0
  const completedDates = Array.isArray(obj.completedDates)
    ? (obj.completedDates.filter(d => typeof d === 'string') as string[])
    : []
  const cycleStart = typeof obj.cycleStart === 'string' ? obj.cycleStart : ''
  const cycleNumber = Number.isFinite(Number(obj.cycleNumber)) ? Number(obj.cycleNumber) : 1
  const isClaimable = obj.isClaimable === true
  const pc = obj.pendingChest && typeof obj.pendingChest === 'object'
    ? (obj.pendingChest as PendingChest)
    : null
  const projectedTier: ChestTier =
    obj.projectedTier === 'gold' || obj.projectedTier === 'silver' || obj.projectedTier === 'bronze'
      ? obj.projectedTier
      : 'bronze'
  const rawWeekScore = Number(obj.weekScore)
  const weekScore = Number.isFinite(rawWeekScore)
    ? Math.max(0, Math.min(100, Math.round(rawWeekScore)))
    : 0
  return {
    daysCompleted,
    currentStreak,
    completedDates,
    cycleStart,
    cycleNumber,
    isClaimable,
    pendingChest: pc,
    projectedTier,
    weekScore,
  }
}

export function useWeeklyChest(): WeeklyChestState {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(DEFAULTS)
  const mountedRef = useRef(true)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/daily/weekly-chest/status')
      .then(async r => {
        // 429/5xx return error JSON; normalize coerces but we still skip the write
        // entirely so a rate-limited refresh doesn't blank out previously-good data.
        if (!r.ok) return null
        return r.json()
      })
      .then(json => {
        if (!mountedRef.current) return
        if (json !== null) setData(normalizeStatus(json))
        setLoading(false)
      })
      .catch(() => { if (mountedRef.current) setLoading(false) })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    return () => { mountedRef.current = false }
  }, [refresh])

  const claim = useCallback(async (): Promise<PendingChest | null> => {
    const res = await fetch('/api/daily/weekly-chest/claim', { method: 'POST' })
    if (!res.ok) return null
    const json = await res.json()
    refresh()
    return json as PendingChest
  }, [refresh])

  return { loading, ...data, claim, refresh }
}
