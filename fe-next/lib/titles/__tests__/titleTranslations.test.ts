import { describe, it, expect } from 'vitest'
import { LEVEL_TITLES, PRESTIGE_CONFIG } from '@/backend/modules/xpManager'
import { ACHIEVEMENT_TITLE_REWARDS } from '@/backend/modules/achievements/progressionAchievements'
import { titleLabelKey } from '@/lib/titles/playerTitles'
import { en } from '@/translations/en.js'
import { he } from '@/translations/he.js'

/** A title badge once showed the raw key HOME.TITLES.WORD_LEGEND: every title id must resolve to text. */
describe('player titles have English and Hebrew text', () => {
  const ids = new Set<string>([
    ...(Object.values(LEVEL_TITLES).filter(Boolean) as string[]),
    ...(Object.values(PRESTIGE_CONFIG.TITLES).filter(Boolean) as string[]),
    ...Object.values(ACHIEVEMENT_TITLE_REWARDS),
  ])
  const get = (o: unknown, key: string) => key.split('.').reduce<unknown>((a, b) => (a as Record<string, unknown> | undefined)?.[b], o)

  it.each([['en', en], ['he', he]] as const)('%s', (_lang, table) => {
    const missing = [...ids].map(titleLabelKey).filter((key) => typeof get(table, key) !== 'string')
    expect(ids.size).toBeGreaterThan(10)
    expect(missing).toEqual([])
  })
})
