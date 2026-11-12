'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getWithAuth, postWithAuth } from '@/utils/authFetch'
import { CARRYOVER_GUEST_SESSION_KEY, GUEST_FINGERPRINT_KEY } from '@/utils/dailyChallenge/constants'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeRetentionStreak } from '@/lib/retention/streak'
import posthog from '@/lib/analytics/lazyPosthog'
import { isChestItemDrop, type ChestItemDrop } from '@/lib/avatar/chestDrops'
import type { NextMilestone, StreakMilestone, WeekDay } from '@/lib/daily/streakRewards'

export interface PendingChest {
  tier: 'bronze' | 'silver' | 'gold'
  coins: number
  badgeId: string
  cycleNumber?: number
  // Prize-pool fields (server may omit on legacy chests; treat as optional).
  freezes?: number
  variantId?: string
  labelKey?: string
  /** The avatar part the chest held (missing on legacy chests / if the part side was down). */
  part?: ChestItemDrop
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
  /** Streak freezes banked on the account (each covers one missed day). */
  freezesAvailable: number
  /** This cycle's chest once opened, with the avatar part it held; null until then. */
  openedChest: PendingChest | null
  /** Streak risk, week strip, milestone and freeze-saved news; null on an older server. */
  streak: ServerStreakBlock | null
  /** True while a claim request is in flight (disable the claim button). */
  claiming: boolean
  /** True when the last claim attempt failed (network / server error). */
  claimError: boolean
  claim: () => Promise<PendingChest | null>
  refresh: (force?: boolean) => void
  /** Signed in but no account answer yet (first load pending or failed): show a skeleton, never the defaults. */
  awaitingFirstLoad: boolean
}

export interface ServerStreakBlock {
  current: number
  playedToday: boolean
  atRisk: boolean
  week: WeekDay[]
  freezeSaved: { date: string; freezesRemaining: number } | null
  milestone: { claimable: StreakMilestone | null; next: NextMilestone | null } | null
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'

const WEEK_STATES = new Set(['played', 'frozen', 'missed', 'today', 'future'])

// Anything malformed drops the whole block, so the UI falls back to the chest numbers.
function normalizeStreakBlock(raw: unknown): ServerStreakBlock | null {
  if (!isRecord(raw) || !Array.isArray(raw.week)) return null
  const week = raw.week.filter(
    (d): d is WeekDay => isRecord(d) && typeof d.date === 'string' && WEEK_STATES.has(String(d.state)) && typeof d.weekday === 'number',
  )
  if (week.length !== 7) return null
  const milestone = isRecord(raw.milestone)
    ? {
        claimable: isRecord(raw.milestone.claimable) ? (raw.milestone.claimable as unknown as StreakMilestone) : null,
        next: isRecord(raw.milestone.next) ? (raw.milestone.next as unknown as NextMilestone) : null,
      }
    : null
  const saved = isRecord(raw.freezeSaved) && typeof raw.freezeSaved.date === 'string'
    ? { date: raw.freezeSaved.date, freezesRemaining: Math.max(0, Number(raw.freezeSaved.freezesRemaining) || 0) }
    : null
  return {
    current: Math.max(0, Math.trunc(Number(raw.current) || 0)),
    playedToday: raw.playedToday === true,
    atRisk: raw.atRisk === true,
    week,
    freezeSaved: saved,
    milestone,
  }
}

function normalizeOpenedChest(raw: unknown): PendingChest | null {
  if (!isRecord(raw)) return null
  const tier = raw.tier
  if (tier !== 'bronze' && tier !== 'silver' && tier !== 'gold') return null
  return {
    tier,
    coins: Math.max(0, Number(raw.coins) || 0),
    badgeId: typeof raw.badgeId === 'string' ? raw.badgeId : '',
    freezes: Math.max(0, Number(raw.freezes) || 0),
    ...(typeof raw.variantId === 'string' ? { variantId: raw.variantId } : {}),
    ...(typeof raw.labelKey === 'string' ? { labelKey: raw.labelKey } : {}),
    ...(isChestItemDrop(raw.part) ? { part: raw.part } : {}),
  }
}

const DEFAULTS = {
  openedChest: null as PendingChest | null,
  streak: null as ServerStreakBlock | null,
  daysCompleted: 0,
  currentStreak: 0,
  completedDates: [] as string[],
  cycleStart: '',
  cycleNumber: 1,
  isClaimable: false,
  pendingChest: null as PendingChest | null,
  projectedTier: 'bronze' as ChestTier,
  weekScore: 0,
  freezesAvailable: 0,
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
  const rawFreezes = Number(obj.freezesAvailable)
  const freezesAvailable = Number.isFinite(rawFreezes) ? Math.max(0, Math.trunc(rawFreezes)) : 0
  return {
    openedChest: normalizeOpenedChest(obj.openedChest),
    streak: normalizeStreakBlock(obj.streak),
    freezesAvailable,
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

// Module-level request de-duplication. The homepage mounts this hook from
// several components (LandingView + HomeDailyHero) in one render pass; without
// this, each instance fired its own GET, and every response triggered a
// re-render — piling main-thread long tasks during hydration. We share a single
// in-flight request and briefly cache the result so a burst of mounts (or a fast
// remount) collapses to one network call. `force` bypasses both (used after claim).
const DEDUP_TTL_MS = 4000
let inflightStatus: Promise<typeof DEFAULTS | null> | null = null
let cachedStatus: typeof DEFAULTS | null = null
let cachedAt = 0

// Every mounted instance shows the same account: a claim in one place must reach the rest.
const listeners = new Set<(status: typeof DEFAULTS) => void>()

/** @internal Reset the module-level dedup cache. For test isolation only —
 * the cache persists for the page lifetime in production by design. */
export function _resetWeeklyChestCache() {
  inflightStatus = null
  cachedStatus = null
  cachedAt = 0
}

// The ids this device played under as a guest, so a new account keeps its streak (server-validated).
const GUEST_ID_KEYS = [GUEST_FINGERPRINT_KEY, 'boggle_guest_session_id', CARRYOVER_GUEST_SESSION_KEY]

function guestIdHeaders(): { headers?: Record<string, string> } {
  try {
    const ids = [...new Set(GUEST_ID_KEYS.map((k) => localStorage.getItem(k)).filter((v): v is string => !!v))]
    return ids.length > 0 ? { headers: { 'x-lc-guest-ids': ids.join(',') } } : {}
  } catch {
    return {}
  }
}

function fetchWeeklyChestStatus(force: boolean): Promise<typeof DEFAULTS | null> {
  if (!force) {
    if (inflightStatus) return inflightStatus
    if (cachedStatus && Date.now() - cachedAt < DEDUP_TTL_MS) {
      return Promise.resolve(cachedStatus)
    }
  }
  inflightStatus = getWithAuth('/api/daily/weekly-chest/status', guestIdHeaders())
    .then(async r => {
      // 429/5xx return error JSON; normalize coerces but we still skip the write
      // entirely so a rate-limited refresh doesn't blank out previously-good data.
      if (!r.ok) return null
      return r.json()
    })
    .then(json => {
      if (json === null) return null
      cachedStatus = normalizeStatus(json)
      cachedAt = Date.now()
      listeners.forEach((fn) => fn(cachedStatus as typeof DEFAULTS))
      return cachedStatus
    })
    .finally(() => { inflightStatus = null })
  return inflightStatus
}

export function useWeeklyChest(): WeeklyChestState {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(DEFAULTS)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState(false)
  const mountedRef = useRef(true)
  const hasLoadedRef = useRef(false)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const claimInFlightRef = useRef(false)

  useEffect(() => {
    listeners.add(setData)
    return () => { listeners.delete(setData) }
  }, [])

  const refresh = useCallback((force = false) => {
    // Only show the loading state for the first load. Background refreshes
    // (e.g. after a claim) keep the card mounted instead of blinking it out —
    // which would also swallow any claim error message.
    if (!hasLoadedRef.current) setLoading(true)
    fetchWeeklyChestStatus(force)
      .then(status => {
        if (!mountedRef.current) return
        if (status !== null) {
          hasLoadedRef.current = true
          setLoadedOnce(true)
          setData(status)
        }
        setLoading(false)
      })
      .catch(() => { if (mountedRef.current) setLoading(false) })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    // Public home mounted this hook for guests too, which fired
    // GET /api/daily/weekly-chest/status → 401 on every pageview. Wait for auth
    // to resolve, then skip the request entirely for guests (UI already falls
    // back to local streak when cycleStart is empty).
    if (authLoading) return
    if (!isAuthenticated) {
      setLoading(false)
      return () => { mountedRef.current = false }
    }
    refresh()
    return () => { mountedRef.current = false }
  }, [refresh, isAuthenticated, authLoading])

  // The account streak lives on the server: refetch when a daily is played or the tab comes back,
  // else the home card keeps showing the pre-play week until a full reload.
  useEffect(() => {
    if (authLoading || !isAuthenticated) return
    const resync = () => {
      if (document.visibilityState === 'hidden') return
      cachedStatus = null
      refresh(true)
    }
    const offPlay = subscribeRetentionStreak(resync)
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('focus', resync)
    window.addEventListener('pageshow', resync)
    return () => {
      offPlay()
      document.removeEventListener('visibilitychange', resync)
      window.removeEventListener('focus', resync)
      window.removeEventListener('pageshow', resync)
    }
  }, [refresh, isAuthenticated, authLoading])

  const claim = useCallback(async (): Promise<PendingChest | null> => {
    // In-flight guard: a double-click must never fire two POSTs.
    if (claimInFlightRef.current) return null
    claimInFlightRef.current = true
    setClaiming(true)
    setClaimError(false)

    posthog.capture('growth:weekly_chest_claim_attempt', {
      cycleNumber: data.cycleNumber,
    })

    try {
      // postWithAuth attaches the bearer token (native app / token sessions);
      // a bare fetch only carries cookies and 401s for bearer-only sessions.
      const res = await postWithAuth('/api/daily/weekly-chest/claim')

      if (!res.ok) {
        posthog.capture('growth:weekly_chest_claim_error', { status: res.status })
        // 409 = already claimed (another tab / retry won), 400 = not ready: the
        // local state is stale, not the request broken — resync, no error toast.
        if (res.status === 409 || res.status === 400) {
          cachedStatus = null
          refresh(true)
        } else if (mountedRef.current) {
          setClaimError(true)
        }
        return null
      }

      const json = await res.json()

      posthog.capture('growth:weekly_chest_claim_success', {
        tier: json.tier,
        coins: json.coins,
        cycleNumber: json.cycleNumber,
        part_rarity: json.part?.rarity ?? null,
        part_duplicate: json.part?.duplicate ?? null,
      })

      // Claiming changes chest state — invalidate the shared cache and force-refetch.
      cachedStatus = null
      refresh(true)
      return json as PendingChest
    } catch {
      posthog.capture('growth:weekly_chest_claim_error', { status: 0 })
      if (mountedRef.current) setClaimError(true)
      return null
    } finally {
      claimInFlightRef.current = false
      if (mountedRef.current) setClaiming(false)
    }
  }, [refresh, data.cycleNumber])

  const awaitingFirstLoad = isAuthenticated && !loadedOnce
  return { loading, ...data, claiming, claimError, claim, refresh, awaitingFirstLoad }
}
