import { describe, it, expect } from 'vitest'
import { wordCraftReducer, buildInitialState } from '../useWordCraftGame'

describe('heat meter', () => {
  it('heat starts at 0', () => {
    const state = buildInitialState(1)
    expect(state.heat).toBe(0)
    expect(state.overdrive).toBe(false)
    expect(state.burnout).toBe(false)
    expect(state.overdriveWarns).toBe(0)
  })

  it('heat increases after player commits a word (score=50 → +16)', () => {
    const state = buildInitialState(1)
    const next = wordCraftReducer(state, {
      type: 'COMMIT_PLAYER', placements: [], score: 50, words: ['TEST'],
    })
    // heatGain = min(floor(50/3), 35) = 16
    expect(next.heat).toBe(16)
    expect(next.overdrive).toBe(false)
  })

  it('heat gain is capped at 35', () => {
    const state = buildInitialState(1)
    const next = wordCraftReducer(state, {
      type: 'COMMIT_PLAYER', placements: [], score: 200, words: ['TEST'],
    })
    // heatGain = min(floor(200/3), 35) = 35
    expect(next.heat).toBe(35)
  })

  it('heat caps at 100 and activates overdrive', () => {
    const state = { ...buildInitialState(1), heat: 95 }
    const next = wordCraftReducer(state, {
      type: 'COMMIT_PLAYER', placements: [], score: 50, words: ['TEST'],
    })
    expect(next.heat).toBe(100)
    expect(next.overdrive).toBe(true)
  })

  it('playing during overdrive resets heat to 60 and clears overdrive', () => {
    const state = { ...buildInitialState(1), heat: 100, overdrive: true, overdriveWarns: 0 }
    const next = wordCraftReducer(state, {
      type: 'COMMIT_PLAYER', placements: [], score: 30, words: ['TEST'],
    })
    expect(next.overdrive).toBe(false)
    expect(next.heat).toBe(60)
    expect(next.overdriveWarns).toBe(0)
  })

  it('PASS while overdrive active increments overdriveWarns', () => {
    const state = { ...buildInitialState(1), heat: 100, overdrive: true, overdriveWarns: 0, turn: 'player' as const }
    const next = wordCraftReducer(state, { type: 'PASS' })
    expect(next.overdriveWarns).toBe(1)
    expect(next.burnout).toBe(false)
  })

  it('second PASS while overdrive active triggers burnout', () => {
    const state = { ...buildInitialState(1), heat: 100, overdrive: true, overdriveWarns: 1, turn: 'player' as const }
    const next = wordCraftReducer(state, { type: 'PASS' })
    expect(next.burnout).toBe(true)
  })

  it('BURNOUT_SKIP resets heat to 40, clears overdrive, switches turn to bot', () => {
    const state = { ...buildInitialState(1), burnout: true, heat: 100, overdrive: true, overdriveWarns: 2, turn: 'player' as const }
    const next = wordCraftReducer(state, { type: 'BURNOUT_SKIP' })
    expect(next.burnout).toBe(false)
    expect(next.heat).toBe(40)
    expect(next.overdrive).toBe(false)
    expect(next.overdriveWarns).toBe(0)
    expect(next.turn).toBe('bot')
  })

  it('bot move does NOT affect player heat', () => {
    const state = { ...buildInitialState(1), heat: 50 }
    const next = wordCraftReducer(state, {
      type: 'COMMIT_BOT', placements: [], score: 80, words: ['BOT'],
    })
    expect(next.heat).toBe(50) // heat unchanged
  })
})
