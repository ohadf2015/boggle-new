import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('gsap', () => ({ default: { from: vi.fn(), to: vi.fn() } }))

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
