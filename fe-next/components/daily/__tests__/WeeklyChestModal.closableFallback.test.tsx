import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }))
vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }))

// gsap mock whose timeline NEVER runs callbacks: simulates a stalled/throttled
// animation (background tab, low-end device). The modal must still become closable.
vi.mock('gsap', () => ({
  __esModule: true,
  default: {
    timeline: vi.fn(() => {
      const tl: Record<string, unknown> = {}
      for (const k of ['to', 'from', 'fromTo', 'add']) tl[k] = vi.fn().mockReturnValue(tl)
      tl.kill = vi.fn()
      return tl
    }),
    to: vi.fn(), from: vi.fn(), fromTo: vi.fn(),
  },
}))

class MockAudio { volume = 0; play = vi.fn().mockResolvedValue(undefined) }
vi.stubGlobal('Audio', MockAudio)

import WeeklyChestModal from '../WeeklyChestModal'

const chest = { tier: 'gold' as const, coins: 600, badgeId: 'badge_weekly_gold' }

describe('WeeklyChestModal closable fallback', () => {
  afterEach(() => { vi.useRealTimers() })

  it('becomes closable after a safety timeout even if the animation never finishes', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
    render(<WeeklyChestModal chest={chest} onClose={vi.fn()} />)
    expect(screen.queryByTestId('chest-continue-button')).toBeNull()
    act(() => { vi.advanceTimersByTime(8000) })
    expect(screen.getByTestId('chest-continue-button')).toBeTruthy()
  })
})
