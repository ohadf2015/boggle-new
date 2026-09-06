import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('gsap', () => ({ __esModule: true, default: { from: vi.fn(), to: vi.fn() } }))

import ChestProgressDots from '../ChestProgressDots'

describe('ChestProgressDots', () => {
  it('renders exactly 7 dots', () => {
    const { container } = render(
      <ChestProgressDots completedDates={['2026-05-10','2026-05-11','2026-05-12']} cycleStart="2026-05-10" />
    )
    expect(container.querySelectorAll('[data-testid="dot"]').length).toBe(7)
  })

  it('marks 3 dots as filled', () => {
    const { container } = render(
      <ChestProgressDots completedDates={['2026-05-10','2026-05-11','2026-05-12']} cycleStart="2026-05-10" />
    )
    expect(container.querySelectorAll('[data-filled="true"]').length).toBe(3)
  })

  it('marks 0 dots as filled when no completions', () => {
    const { container } = render(
      <ChestProgressDots completedDates={[]} cycleStart="2026-05-10" />
    )
    expect(container.querySelectorAll('[data-filled="true"]').length).toBe(0)
  })

  it('marks past unfilled days as missed (X) and future as pending', () => {
    const { container } = render(
      <ChestProgressDots
        completedDates={['2026-05-10', '2026-05-11']}
        cycleStart="2026-05-10"
        today="2026-05-13"
      />
    )
    expect(container.querySelectorAll('[data-testid="dot"]').length).toBe(7)
    // Only May 12 is past+unfilled → missed
    expect(container.querySelectorAll('[data-missed="true"]').length).toBe(1)
    expect(container.querySelectorAll('[data-filled="true"]').length).toBe(2)
  })

  it('never marks today or future days as missed', () => {
    const { container } = render(
      <ChestProgressDots
        completedDates={[]}
        cycleStart="2026-05-10"
        today="2026-05-10"
      />
    )
    expect(container.querySelectorAll('[data-missed="true"]').length).toBe(0)
  })
})

// ------------------------------------------------------------------
// Missed dots must be tappable (catch-up) instead of dead markers.
// ------------------------------------------------------------------
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}))

describe('ChestProgressDots — tappable missed days', () => {
  it('Given a missed day inside the catch-up window, When rendered, Then the dot is a link to that day\'s catch-up play', () => {
    const { container } = render(
      <ChestProgressDots completedDates={['2026-05-10']} cycleStart="2026-05-10" today="2026-05-12" />
    )
    const missed = container.querySelector('[data-missed="true"]') as HTMLElement
    expect(missed).not.toBeNull()
    expect(missed.tagName).toBe('A')
    expect(missed.getAttribute('href')).toBe('/en/daily/word-hunt?date=2026-05-11')
  })

  it('Given a missed day outside the catch-up window, When rendered, Then the dot is not a link', () => {
    const { container } = render(
      <ChestProgressDots completedDates={[]} cycleStart="2026-05-01" today="2026-05-07" />
    )
    // 2026-05-01 is 6 days before today → outside the 3-day window
    const first = container.querySelectorAll('[data-testid="dot"]')[0] as HTMLElement
    expect(first.getAttribute('data-missed')).toBe('true')
    expect(first.tagName).not.toBe('A')
  })

  it('Given a completed day, When rendered, Then the dot links to that day\'s archive results', () => {
    const { container } = render(
      <ChestProgressDots completedDates={['2026-05-10']} cycleStart="2026-05-10" today="2026-05-12" />
    )
    const filled = container.querySelector('[data-filled="true"]') as HTMLElement
    expect(filled.tagName).toBe('A')
    expect(filled.getAttribute('href')).toBe('/en/daily/archive/2026-05-10')
  })
})
