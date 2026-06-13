import { describe, it, expect } from 'vitest'
import { wordCraftReducer, buildInitialState } from '../useWordCraftGame'

// The heat / overdrive / burnout momentum system was removed in the Conquest
// redesign — territory captures are the only momentum now. The state fields are
// kept (so the wider UI types don't churn) but must stay permanently inert.
describe('heat system removed (Conquest mode)', () => {
  it('heat / overdrive / burnout start inert', () => {
    const state = buildInitialState(1)
    expect(state.heat).toBe(0)
    expect(state.overdrive).toBe(false)
    expect(state.burnout).toBe(false)
    expect(state.overdriveWarns).toBe(0)
  })

  it('committing a high-scoring word never raises heat or triggers overdrive', () => {
    const state = buildInitialState(1)
    const next = wordCraftReducer(state, {
      type: 'COMMIT_PLAYER', placements: [], score: 999, words: ['TEST'],
    })
    expect(next.heat).toBe(0)
    expect(next.overdrive).toBe(false)
    expect(next.burnout).toBe(false)
  })

  it('committing a bot word never raises heat', () => {
    const state = buildInitialState(1)
    const next = wordCraftReducer(state, {
      type: 'COMMIT_BOT', placements: [], score: 999, words: ['TEST'],
    })
    expect(next.heat).toBe(0)
    expect(next.overdrive).toBe(false)
  })

  it('passing never escalates overdrive warnings or burnout', () => {
    let state = buildInitialState(1)
    state = wordCraftReducer(state, { type: 'PASS' })
    state = wordCraftReducer(state, { type: 'PASS' })
    expect(state.overdriveWarns).toBe(0)
    expect(state.burnout).toBe(false)
  })

  it('BURNOUT_SKIP is an inert no-op', () => {
    const state = { ...buildInitialState(1), burnout: true, heat: 100, overdrive: true }
    const next = wordCraftReducer(state, { type: 'BURNOUT_SKIP' })
    // Returns state unchanged — burnout no longer drives the turn.
    expect(next).toBe(state)
  })
})
