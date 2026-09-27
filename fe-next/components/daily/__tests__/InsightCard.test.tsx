import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import InsightCard from '../InsightCard'
import React from 'react'

vi.mock('framer-motion', () => ({
  m: new Proxy(
    {},
    {
      get: (_target, prop) => {
        return ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) =>
          React.createElement(prop as string, rest, children)
      },
    }
  ),
}))

describe('InsightCard', () => {
  it('renders headline and sub', () => {
    render(
      <InsightCard
        type="personal_best"
        headline="New record!"
        sub="+23 pts"
        lucideIcon="Trophy"
        index={0}
      />
    )
    expect(screen.getByText('New record!')).toBeTruthy()
    expect(screen.getByText('+23 pts')).toBeTruthy()
  })

  it('renders without crashing for each insight type', () => {
    const types = [
      'personal_best',
      'percentile',
      'speed',
      'first_try',
      'streak_complete',
      'improved',
    ] as const
    for (const type of types) {
      const { unmount } = render(
        <InsightCard
          type={type}
          headline="h"
          sub="s"
          lucideIcon="Trophy"
        />
      )
      unmount()
    }
  })

  it('uses Trophy icon for lucideIcon=Trophy', () => {
    const { container } = render(
      <InsightCard
        type="personal_best"
        headline="h"
        sub="s"
        lucideIcon="Trophy"
      />
    )
    // Lucide renders SVG elements
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
