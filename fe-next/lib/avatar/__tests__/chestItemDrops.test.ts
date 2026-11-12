import { describe, it, expect } from 'vitest'
import {
  CHEST_COSMETIC_ODDS,
  CHEST_COSMETIC_POOL,
  CHEST_DROP_SOURCES,
  isChestCosmeticDrop,
  isChestItemDrop,
  isChestPartDrop,
  rollChestItem,
} from '../chestDrops'
import { COSMETICS, isUnlocked } from '@/lib/cosmetics'

const roll = (seed: string, ownedCosmetics: string[] = []) =>
  rollChestItem({ source: 'day_perfect', seed, ownedKeys: [], level: 1, ownedCosmetics })

describe('chest items: avatar part, or a tile skin / board theme', () => {
  it('pools only non-common tile skins and board themes', () => {
    const ids = Object.values(CHEST_COSMETIC_POOL).flat()
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      const c = COSMETICS.find((x) => x.id === id)!
      expect(['tileSkin', 'boardTheme']).toContain(c.category)
      expect(c.rarity).not.toBe('common')
    }
  })

  it('hands out a skin or theme on roughly the published share of rolls, never one already owned', () => {
    const n = 4000
    let cosmetics = 0
    for (let i = 0; i < n; i++) {
      const drop = roll(`p${i}|day_perfect|2026-11-12`, ['tile-neon'])
      expect(isChestItemDrop(drop)).toBe(true)
      if (isChestCosmeticDrop(drop)) {
        cosmetics++
        expect(drop.cosmeticId).not.toBe('tile-neon')
        expect(drop.duplicate).toBe(false)
      }
    }
    // Some rarities run out of unowned items and fall back to a part, so the share sits at or under the odds.
    expect(cosmetics / n).toBeGreaterThan(0.1)
    expect(cosmetics / n).toBeLessThanOrEqual(CHEST_COSMETIC_ODDS.day_perfect / 100 + 0.02)
  })

  it('falls back to an avatar part when every skin and theme is owned', () => {
    const all = Object.values(CHEST_COSMETIC_POOL).flat()
    for (let i = 0; i < 300; i++) expect(isChestPartDrop(roll(`q${i}`, all))).toBe(true)
  })

  it('rolls the same item for the same seed', () => {
    expect(roll('same-seed')).toEqual(roll('same-seed'))
  })

  it('every chest source has cosmetic odds', () => {
    for (const s of CHEST_DROP_SOURCES) expect(CHEST_COSMETIC_ODDS[s]).toBeGreaterThan(0)
  })

  it('an owned rank-gated item counts as unlocked (found in a chest)', () => {
    const state = { rankTier: 'stone', streakDays: 0, coins: 0, seasonRewards: [], purchasedIds: ['tile-fire'], equippedIds: {} }
    expect(isUnlocked('tile-fire', state)).toBe(true)
    expect(isUnlocked('tile-crystal', state)).toBe(false)
  })
})
