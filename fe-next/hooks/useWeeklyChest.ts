'use client'
import { useState, useEffect, useCallback } from 'react'

export interface PendingChest {
  tier: 'bronze' | 'silver' | 'gold'
  coins: number
  badgeId: string
  cycleNumber?: number
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

export function useWeeklyChest(): WeeklyChestState {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(DEFAULTS)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/daily/weekly-chest/status')
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false) })
      .catch(() => setLoading(false))
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
