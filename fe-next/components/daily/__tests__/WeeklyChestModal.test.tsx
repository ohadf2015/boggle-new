import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }))

// Track Audio constructions so we can assert per-sound volumes were applied.
// Names start with `mock` so Jest's hoisting check allows them to be referenced
// from inside mock factories.
const mockAudioInstances: Array<{ src: string; volume: number; play: jest.Mock | ((...args: unknown[]) => unknown) }> = []
class MockAudio {
  src: string
  volume = 0
  play = vi.fn().mockResolvedValue(undefined)
  constructor(src: string) {
    this.src = src
    mockAudioInstances.push(this)
  }
}
vi.stubGlobal('Audio', MockAudio)

// Track haptic invocations.
const mockHapticCalls: string[] = []
vi.mock('@/utils/hapticFeedback', () => ({
  triggerHaptic: (pattern: string) => { mockHapticCalls.push(pattern); return true },
}))

// gsap mock — runs every `add()` callback synchronously so the reveal's side
// effects (sound playback, haptic triggers, state updates) all happen during
// the initial render. `__esModule: true` is required for `import gsap from 'gsap'`
// to resolve to `.default` under Jest's CJS-interop layer.
vi.mock('gsap', () => ({
  __esModule: true,
  default: {
    timeline: vi.fn(() => {
      const tl: Record<string, unknown> = {}
      tl.to = vi.fn().mockReturnValue(tl)
      tl.from = vi.fn().mockReturnValue(tl)
      tl.fromTo = vi.fn().mockReturnValue(tl)
      tl.add = vi.fn((cb: unknown) => {
        if (typeof cb === 'function') (cb as () => void)()
        return tl
      })
      tl.kill = vi.fn()
      return tl
    }),
    to: vi.fn(),
    from: vi.fn(),
    fromTo: vi.fn(),
  },
}))

import WeeklyChestModal from '../WeeklyChestModal'

const chest = { tier: 'gold' as const, coins: 600, badgeId: 'badge_weekly_gold', cycleNumber: 2 }

beforeEach(() => {
  mockAudioInstances.length = 0
  mockHapticCalls.length = 0
})

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

  it('plays the initial shake sound at reduced volume', () => {
    render(<WeeklyChestModal chest={chest} onClose={vi.fn()} />)
    const shake = mockAudioInstances.find(a => a.src.includes('earthquake-shake'))
    expect(shake).toBeTruthy()
    // Per-sound volumes: shake stays in the 0.3-0.4 band so the fanfare can punch through.
    expect(shake!.volume).toBeLessThan(0.5)
    expect(shake!.volume).toBeGreaterThan(0.2)
  })

  it('fires heavy haptic + louder open sound when the chest bursts open', () => {
    render(<WeeklyChestModal chest={chest} onClose={vi.fn()} />)
    const open = mockAudioInstances.find(a => a.src.includes('chest-open'))
    expect(open).toBeTruthy()
    expect(open!.volume).toBeGreaterThan(0.6)
    expect(mockHapticCalls).toContain('heavy')
  })

  it('fires the success haptic when the coin counter completes', () => {
    vi.useFakeTimers()
    try {
      render(<WeeklyChestModal chest={{ ...chest, coins: 60 }} onClose={vi.fn()} />)
      // Counter ticks every 40ms, 60 coins / step(2) = 30 ticks -> 1200ms total.
      vi.advanceTimersByTime(2000)
      expect(mockHapticCalls).toContain('success')
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders the prize hero label prominently when labelKey is provided', () => {
    render(
      <WeeklyChestModal
        chest={{ ...chest, labelKey: 'daily.weeklyChest.prize.dragonHoard' }}
        onClose={vi.fn()}
      />
    )
    const label = screen.getByTestId('chest-prize-label')
    expect(label.textContent).toBe('daily.weeklyChest.prize.dragonHoard')
    // Hero treatment: large display type.
    expect(label.className).toContain('text-2xl')
  })

  it('uses the plural freeze label when more than one freeze is granted', () => {
    render(
      <WeeklyChestModal
        chest={{ ...chest, freezes: 2 }}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByTestId('chest-freeze-bonus').textContent).toContain('freezesGrantedPlural')
  })

  it('uses the singular freeze label when exactly one freeze is granted', () => {
    render(
      <WeeklyChestModal
        chest={{ ...chest, freezes: 1 }}
        onClose={vi.fn()}
      />
    )
    const chip = screen.getByTestId('chest-freeze-bonus')
    expect(chip.textContent).toContain('freezesGranted')
    expect(chip.textContent).not.toContain('freezesGrantedPlural')
  })

  it('hides the freeze chip when no freezes are granted', () => {
    render(<WeeklyChestModal chest={chest} onClose={vi.fn()} />)
    expect(screen.queryByTestId('chest-freeze-bonus')).toBeNull()
  })

  it('closes on Escape once the reveal is complete', () => {
    // The gsap mock fires add() callbacks synchronously, so the final
    // setCanClose(true) runs during the initial effect — by the time render
    // returns, the Escape listener is wired up.
    const onClose = vi.fn()
    render(<WeeklyChestModal chest={chest} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on backdrop click once the reveal is complete', () => {
    const onClose = vi.fn()
    render(<WeeklyChestModal chest={chest} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalled()
  })

  it('exposes the prize via an aria-live region for screen readers', () => {
    const { container } = render(
      <WeeklyChestModal
        chest={{ ...chest, labelKey: 'daily.weeklyChest.prize.dragonHoard', freezes: 2 }}
        onClose={vi.fn()}
      />
    )
    const live = container.querySelector('[aria-live="polite"]')
    expect(live).toBeTruthy()
  })

  it('renders the styled continue button after the reveal completes', () => {
    render(<WeeklyChestModal chest={chest} onClose={vi.fn()} />)
    expect(screen.getByTestId('chest-continue-button')).toBeTruthy()
  })
})
