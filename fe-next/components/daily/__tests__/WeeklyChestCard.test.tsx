import { render, screen, fireEvent } from '@testing-library/react'
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
  __esModule: true,
  default: {
    to: vi.fn().mockReturnValue({ kill: vi.fn() }),
    from: vi.fn().mockReturnValue({ kill: vi.fn() }),
  },
}))

vi.mock('framer-motion', () => ({
  __esModule: true,
  m: new Proxy(
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
  __esModule: true,
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
  projectedTier: 'silver' as const,
  weekScore: 55,
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

  it('renders a tier chest image thumbnail', () => {
    mockUseWeeklyChest.mockReturnValue({
      ...defaultMockData,
      pendingChest: { tier: 'gold', coins: 600, badgeId: 'b' },
    })
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    const img = screen.getByTestId('chest-tier-thumb') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('src') || '').toContain('chest-gold')
  })

  it('shows the projected-tier chest image when there is no pending chest', () => {
    // projectedTier drives the thumbnail pre-claim — no more misleading hardcoded silver
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    const img = screen.getByTestId('chest-tier-thumb') as HTMLImageElement
    expect(img.getAttribute('src') || '').toContain('chest-silver')
  })

  it('reflects a gold projected tier in the chest thumbnail', () => {
    mockUseWeeklyChest.mockReturnValue({ ...defaultMockData, projectedTier: 'gold' })
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    const img = screen.getByTestId('chest-tier-thumb') as HTMLImageElement
    expect(img.getAttribute('src') || '').toContain('chest-gold')
  })

  it('opens the explainer modal when the chest is clicked', () => {
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    expect(screen.queryByText('daily.weeklyChest.info.streakReset')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'daily.weeklyChest.info.title' }))
    expect(screen.getByText('daily.weeklyChest.info.streakReset')).toBeTruthy()
  })

  it('renders a progress bar with the correct aria value', () => {
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    const bar = screen.getByTestId('chest-progress-bar')
    expect(bar.getAttribute('aria-valuenow')).toBe('4')
    expect(bar.getAttribute('aria-valuemax')).toBe('7')
  })

  it('shows the day counter pill as N/7', () => {
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    expect(screen.getByTestId('chest-day-counter').textContent).toBe('4/7')
  })

  it('never renders the literal string "undefined" or "NaN"', () => {
    // Simulate a broken/error API response that leaks through the hook layer.
    mockUseWeeklyChest.mockReturnValue({
      loading: false,
      daysCompleted: undefined as unknown as number,
      completedDates: [],
      cycleStart: '',
      cycleNumber: 1,
      isClaimable: false,
      pendingChest: null,
      claim: vi.fn(),
      refresh: vi.fn(),
    })
    const { container } = render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    expect(container.textContent || '').not.toMatch(/undefined|NaN/)
    expect(screen.getByTestId('chest-day-counter').textContent).toBe('0/7')
    expect(screen.getByTestId('chest-progress-bar').getAttribute('aria-valuenow')).toBe('0')
  })

  it('clamps daysCompleted above 7 to 7 so the bar never overflows', () => {
    mockUseWeeklyChest.mockReturnValue({
      ...defaultMockData,
      daysCompleted: 42,
    })
    render(<WeeklyChestCard onChestClaimed={vi.fn()} />)
    expect(screen.getByTestId('chest-day-counter').textContent).toBe('7/7')
    expect(screen.getByTestId('chest-progress-bar').getAttribute('aria-valuenow')).toBe('7')
  })
})
