import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }))

class MockAudio {
  volume = 0
  play = vi.fn().mockResolvedValue(undefined)
}
vi.stubGlobal('Audio', MockAudio)

vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      add: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    })),
    to: vi.fn(),
    from: vi.fn(),
    fromTo: vi.fn(),
  },
}))

import WeeklyChestModal from '../WeeklyChestModal'

const chest = { tier: 'gold' as const, coins: 600, badgeId: 'badge_weekly_gold', cycleNumber: 2 }

describe('WeeklyChestModal', () => {
  it('renders the dialog element', () => {
    render(<WeeklyChestModal chest={chest} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('has aria-modal for accessibility', () => {
    render(<WeeklyChestModal chest={chest} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true')
  })

  it('renders without crashing for each tier', () => {
    for (const tier of ['bronze', 'silver', 'gold'] as const) {
      const { unmount } = render(
        <WeeklyChestModal chest={{ tier, coins: 150, badgeId: `badge_weekly_${tier}` }} onClose={vi.fn()} />
      )
      unmount()
    }
  })
})
