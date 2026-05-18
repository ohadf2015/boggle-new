import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }))

// Track Audio constructions so we can assert per-sound volumes were applied.
const audioInstances: Array<{ src: string; volume: number; play: ReturnType<typeof vi.fn> }> = []
class MockAudio {
  src: string
  volume = 0
  play = vi.fn().mockResolvedValue(undefined)
  constructor(src: string) {
    this.src = src
    audioInstances.push(this)
  }
}
vi.stubGlobal('Audio', MockAudio)

// Mock haptics so we can assert haptic patterns fire.
const hapticCalls: string[] = []
vi.mock('@/utils/hapticFeedback', () => ({
  triggerHaptic: (pattern: string) => { hapticCalls.push(pattern); return true },
}))

// gsap timeline mock — capture .add() callbacks so we can advance the timeline
// synchronously and inspect side effects (sound + haptic firings, interval start).
let addCallbacks: Array<() => void> = []
vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      add: vi.fn().mockImplementation(function (this: unknown, cb: () => void) {
        if (typeof cb === 'function') addCallbacks.push(cb)
        return this
      }),
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

beforeEach(() => {
  audioInstances.length = 0
  hapticCalls.length = 0
  addCallbacks = []
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
    const shake = audioInstances.find(a => a.src.includes('earthquake-shake'))
    expect(shake).toBeTruthy()
    // Per-sound volumes: shake stays in the 0.3–0.4 band so the fanfare can punch through.
    expect(shake!.volume).toBeLessThan(0.5)
    expect(shake!.volume).toBeGreaterThan(0.2)
    expect(shake!.play).toHaveBeenCalled()
  })

  it('fires heavy haptic + louder open sound when the chest bursts open', () => {
    render(<WeeklyChestModal chest={chest} onClose={vi.fn()} />)
    // Replay the timeline callbacks in order — the first one is the "burst" act.
    addCallbacks.forEach(cb => cb())
    const open = audioInstances.find(a => a.src.includes('chest-open'))
    expect(open).toBeTruthy()
    expect(open!.volume).toBeGreaterThan(0.6)
    expect(hapticCalls).toContain('heavy')
  })

  it('fires success haptic when the coin counter completes', () => {
    vi.useFakeTimers()
    render(<WeeklyChestModal chest={{ ...chest, coins: 60 }} onClose={vi.fn()} />)
    addCallbacks.forEach(cb => cb())
    // Counter ticks every 40ms, 60 coins / step(2) = 30 ticks → 1200ms total.
    vi.advanceTimersByTime(2000)
    expect(hapticCalls).toContain('success')
    vi.useRealTimers()
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

  it('does NOT close on Escape before the reveal animation is done', () => {
    const onClose = vi.fn()
    render(<WeeklyChestModal chest={chest} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on Escape once the reveal completes', () => {
    const onClose = vi.fn()
    render(<WeeklyChestModal chest={chest} onClose={onClose} />)
    // Drain the timeline callbacks — last one flips canClose=true. Wrap in act
    // so the Escape useEffect re-runs and attaches the listener before we fire.
    act(() => { addCallbacks.forEach(cb => cb()) })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on backdrop click once the reveal completes', () => {
    const onClose = vi.fn()
    render(<WeeklyChestModal chest={chest} onClose={onClose} />)
    act(() => { addCallbacks.forEach(cb => cb()) })
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalled()
  })

  it('does NOT close on backdrop click before the reveal completes', () => {
    const onClose = vi.fn()
    render(<WeeklyChestModal chest={chest} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()
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
})
