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
})
