import { postWithAuth } from '@/utils/authFetch'

export type MilestoneClaimOutcome =
  | { ok: true; days: number; coins: number; claimed: boolean }
  | { ok: false; reason: 'nothing' | 'failed' }

export async function claimStreakMilestoneRequest(): Promise<MilestoneClaimOutcome> {
  try {
    const res = await postWithAuth('/api/daily/streak/milestone')
    const body = await res.json().catch(() => ({}))
    if (res.ok && typeof body.days === 'number' && typeof body.coins === 'number') {
      return { ok: true, days: body.days, coins: body.coins, claimed: body.claimed === true }
    }
    return { ok: false, reason: res.status === 400 ? 'nothing' : 'failed' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}

export type FreezeBuyOutcome =
  | { ok: true; freezes: number; newBalance: number }
  | { ok: false; reason: 'max_held' | 'insufficient_coins' | 'failed' }

export async function buyStreakFreezeRequest(): Promise<FreezeBuyOutcome> {
  try {
    const res = await postWithAuth('/api/daily/streak/freeze')
    const body = await res.json().catch(() => ({}))
    if (res.ok) return { ok: true, freezes: Number(body.freezes) || 0, newBalance: Number(body.newBalance) || 0 }
    if (body.error === 'max_held' || body.error === 'insufficient_coins') return { ok: false, reason: body.error }
    return { ok: false, reason: 'failed' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
