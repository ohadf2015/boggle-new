import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUseWeeklyChest = vi.fn()

vi.mock('@/hooks/useWeeklyChest', () => ({
  useWeeklyChest: () => mockUseWeeklyChest(),
}))

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    isRTL: false,
    language: 'en',
    dir: 'ltr',
  }),
}))

vi.mock('gsap', () => ({
  default: {
    to: vi.fn().mockReturnValue({ kill: vi.fn() }),
  },
}))

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_t: unknown, prop: string) => {
        return ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => {
          const React = require('react')
          return React.createElement(prop, rest, children)
        }
      },
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/components/daily/ChestProgressDots', () => ({
  default: () => <div data-testid="chest-dots" />,
}))

import WeeklyChestCard from '../WeeklyChestCard'

const defaultMockData = {
  loading: false,
  daysCompleted: 4,
  completedDates: ['2026-05-09', '2026-05-10', '2026-05-11', '2026-05-12'],
  cycleStart: '2026-05-09',
  cycleNumber: 1,
  isClaimable: false,
  pendingChest: null,
  claim: vi.fn(),
  refresh: vi.fn(),
}

describe('WeeklyChestCard', () => {
  beforeEach(() => {
    mockUseWeeklyChest.mockReturnValue(defaultMockData)
  })

  it('renders title', () => {
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    expect(screen.getByText('daily.weeklyChest.title')).toBeTruthy()
  })

  it('does not show claim button when not claimable', () => {
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    expect(screen.queryByText('daily.weeklyChest.claimButton')).toBeNull()
  })

  it('renders null while loading', () => {
    mockUseWeeklyChest.mockReturnValue({
      loading: true,
      daysCompleted: 0,
      completedDates: [],
      cycleStart: '',
      cycleNumber: 1,
      isClaimable: false,
      pendingChest: null,
      claim: vi.fn(),
      refresh: vi.fn(),
    })

    const { container } = render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders progress dots when cycleStart exists', () => {
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    expect(screen.getByTestId('chest-dots')).toBeTruthy()
  })

  it('displays days remaining text when not claimable', () => {
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    const text = screen.getByText((content) =>
      content.includes('daily.weeklyChest.daysRemaining')
    )
    expect(text).toBeTruthy()
  })
})
