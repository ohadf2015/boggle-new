/**
 * The weekly chest is the app's best brag moment and had no share action, and
 * its art was stock chest JPEGs rather than the mascot. These tests pin the
 * additions: mascot chest art, a tier-hot backdrop, and a share button.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, f?: string) => f ?? k, language: 'en' }),
}))

class MockAudio {
  src: string
  volume = 0
  play = vi.fn().mockResolvedValue(undefined)
  constructor(src: string) { this.src = src }
}
vi.stubGlobal('Audio', MockAudio)

vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: () => true }))

vi.mock('gsap', () => ({
  __esModule: true,
  default: {
    timeline: vi.fn(() => {
      const tl: Record<string, unknown> = {}
      tl.to = vi.fn().mockReturnValue(tl)
      tl.from = vi.fn().mockReturnValue(tl)
      tl.fromTo = vi.fn().mockReturnValue(tl)
      tl.add = vi.fn((cb: unknown) => { if (typeof cb === 'function') (cb as () => void)(); return tl })
      tl.kill = vi.fn()
      return tl
    }),
    to: vi.fn(), from: vi.fn(), fromTo: vi.fn(),
  },
}))

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid={`mascot-${variant}`} />,
}))

const shareStreak = vi.fn()
vi.mock('@/utils/streakShare', () => ({ shareStreak: (...a: unknown[]) => shareStreak(...a) }))

import WeeklyChestModal from '../WeeklyChestModal'

const chest = { tier: 'gold' as const, coins: 600, badgeId: 'badge_weekly_gold', cycleNumber: 2 }

describe('WeeklyChestModal — streak heat + share', () => {
  beforeEach(() => {
    shareStreak.mockReset()
    shareStreak.mockResolvedValue(true)
  })

  it('uses the mascot chest art, not a stock chest image', () => {
    render(<WeeklyChestModal chest={chest} streak={30} onClose={vi.fn()} />)
    expect(screen.getByTestId('mascot-streakChestClosed')).toBeInTheDocument()
  })

  it('reveals the mascot bursting out of the chest', () => {
    render(<WeeklyChestModal chest={chest} streak={30} onClose={vi.fn()} />)
    expect(screen.getByTestId('mascot-streakChestOpen')).toBeInTheDocument()
  })

  it('tints the backdrop with the streak tier so a hotter streak looks hotter', () => {
    const { rerender } = render(<WeeklyChestModal chest={chest} streak={1} onClose={vi.fn()} />)
    const cool = screen.getByTestId('chest-backdrop').getAttribute('style')

    rerender(<WeeklyChestModal chest={chest} streak={120} onClose={vi.fn()} />)
    expect(screen.getByTestId('chest-backdrop').getAttribute('style')).not.toEqual(cool)
  })

  it('offers a share action and passes the real streak to it', async () => {
    render(<WeeklyChestModal chest={chest} streak={30} onClose={vi.fn()} />)
    fireEvent.click(screen.getByTestId('chest-share-button'))
    await waitFor(() => expect(shareStreak).toHaveBeenCalledTimes(1))
    expect(shareStreak.mock.calls[0][0]).toMatchObject({ streak: 30, tierId: 'legendary' })
  })

  it('still renders and closes when no streak is supplied', () => {
    // The modal is mounted from several places; a missing streak must degrade,
    // not crash the reward screen.
    const onClose = vi.fn()
    render(<WeeklyChestModal chest={chest} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('chest-continue-button'))
    expect(onClose).toHaveBeenCalled()
  })

  it('hides the share action with no streak to brag about', () => {
    render(<WeeklyChestModal chest={chest} streak={0} onClose={vi.fn()} />)
    expect(screen.queryByTestId('chest-share-button')).not.toBeInTheDocument()
  })
})
