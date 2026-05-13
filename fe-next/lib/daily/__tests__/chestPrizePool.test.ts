import { describe, it, expect } from 'vitest'
import {
  CHEST_PRIZE_POOL,
  selectChestPrize,
  type ChestPrize,
} from '../chestPrizePool'

describe('chestPrizePool', () => {
  describe('CHEST_PRIZE_POOL', () => {
    it('has at least 3 variants per tier so weekly claims feel fresh', () => {
      expect(CHEST_PRIZE_POOL.bronze.length).toBeGreaterThanOrEqual(3)
      expect(CHEST_PRIZE_POOL.silver.length).toBeGreaterThanOrEqual(3)
      expect(CHEST_PRIZE_POOL.gold.length).toBeGreaterThanOrEqual(3)
    })

    it('every variant carries the matching tier badge', () => {
      const tiers: Array<'bronze' | 'silver' | 'gold'> = ['bronze', 'silver', 'gold']
      tiers.forEach((tier) => {
        CHEST_PRIZE_POOL[tier].forEach((prize) => {
          expect(prize.badgeId).toBe(`badge_weekly_${tier}`)
        })
      })
    })

    it('gold variants are richer than silver, and silver richer than bronze', () => {
      const avg = (prizes: ChestPrize[]) =>
        prizes.reduce((s, p) => s + p.coins, 0) / prizes.length
      expect(avg(CHEST_PRIZE_POOL.gold)).toBeGreaterThan(avg(CHEST_PRIZE_POOL.silver))
      expect(avg(CHEST_PRIZE_POOL.silver)).toBeGreaterThan(avg(CHEST_PRIZE_POOL.bronze))
    })

    it('every variant has a unique variantId per tier', () => {
      const tiers: Array<'bronze' | 'silver' | 'gold'> = ['bronze', 'silver', 'gold']
      tiers.forEach((tier) => {
        const ids = CHEST_PRIZE_POOL[tier].map((p) => p.variantId)
        expect(new Set(ids).size).toBe(ids.length)
      })
    })

    it('every variant carries a labelKey (for i18n)', () => {
      Object.values(CHEST_PRIZE_POOL)
        .flat()
        .forEach((p) => {
          expect(p.labelKey).toMatch(/^daily\.weeklyChest\.prize\./)
        })
    })
  })

  describe('selectChestPrize', () => {
    it('is deterministic — same tier + seed picks the same prize on retry', () => {
      const a = selectChestPrize('gold', 'user-abc::2026-05-06')
      const b = selectChestPrize('gold', 'user-abc::2026-05-06')
      expect(a.variantId).toBe(b.variantId)
    })

    it('different seeds can yield different prizes (covers >1 variant over 50 seeds)', () => {
      const picks = new Set<string>()
      for (let i = 0; i < 50; i++) {
        picks.add(selectChestPrize('silver', `user-${i}::2026-05-06`).variantId)
      }
      expect(picks.size).toBeGreaterThan(1)
    })

    it('returns a prize whose tier matches the requested tier', () => {
      const prize = selectChestPrize('bronze', 'seed-1')
      expect(prize.badgeId).toBe('badge_weekly_bronze')
    })

    it('handles empty seed gracefully (returns the first variant)', () => {
      const prize = selectChestPrize('gold', '')
      expect(prize).toBe(CHEST_PRIZE_POOL.gold[0])
    })
  })
})
