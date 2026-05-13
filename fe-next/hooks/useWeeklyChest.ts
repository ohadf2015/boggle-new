'use client'
import { useState, useEffect, useCallback } from 'react'

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

export interface WeeklyChestState {
  loading: boolean
  daysCompleted: number
  completedDates: string[]
  cycleStart: string
  cycleNumber: number
  isClaimable: boolean
  pendingChest: PendingChest | null
  claim: () => Promise<PendingChest | null>
  refresh: () => void
}

const DEFAULTS = {
  daysCompleted: 0,
  completedDates: [] as string[],
  cycleStart: '',
  cycleNumber: 1,
  isClaimable: false,
  pendingChest: null as PendingChest | null,
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
  const completedDates = Array.isArray(obj.completedDates)
    ? (obj.completedDates.filter(d => typeof d === 'string') as string[])
    : []
  const cycleStart = typeof obj.cycleStart === 'string' ? obj.cycleStart : ''
  const cycleNumber = Number.isFinite(Number(obj.cycleNumber)) ? Number(obj.cycleNumber) : 1
  const isClaimable = obj.isClaimable === true
  const pc = obj.pendingChest && typeof obj.pendingChest === 'object'
    ? (obj.pendingChest as PendingChest)
    : null
  return { daysCompleted, completedDates, cycleStart, cycleNumber, isClaimable, pendingChest: pc }
}

export function useWeeklyChest(): WeeklyChestState {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(DEFAULTS)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/daily/weekly-chest/status')
      .then(r => r.json())
      .then(json => { setData(normalizeStatus(json)); setLoading(false) })
      .catch(() => { setData(DEFAULTS); setLoading(false) })
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const claim = useCallback(async (): Promise<PendingChest | null> => {
    const res = await fetch('/api/daily/weekly-chest/claim', { method: 'POST' })
    if (!res.ok) return null
    const json = await res.json()
    refresh()
    return json as PendingChest
  }, [refresh])

  return { loading, ...data, claim, refresh }
}
