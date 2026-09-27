import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DailyInsightStack from '../DailyInsightStack'

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, isRTL: false }),
}))

// Component fetches via getWithAuth (Bearer wrapper); delegate to whatever
// global.fetch each test installs, preserving call args.
vi.mock('@/utils/authFetch', () => ({
  getWithAuth: (...args: unknown[]) => (global.fetch as (...a: unknown[]) => unknown)(...args),
}))

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: (_t: unknown, prop: string) => {
       
      return ({ children, ...rest }: any) => {
        const React = require('react')
        return React.createElement(prop, rest, children)
      }
    },
  }),
}))

describe('DailyInsightStack', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing when insights array is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ insights: [] }) })
    const { container } = render(<DailyInsightStack mode="word_hunt" date="2026-05-12" />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    }, { timeout: 500 })
  })

  it('renders up to 3 insight cards', async () => {
    const insights = Array.from({ length: 3 }, (_, i) => ({
      type: 'improved', headlineKey: `h${i}`, subKey: `s${i}`, lucideIcon: 'TrendingUp',
    }))
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ insights }) })
    const { container } = render(<DailyInsightStack mode="word_hunt" date="2026-05-12" />)
    await waitFor(() => {
      const cards = container.querySelectorAll('[data-testid="insight-card"]')
      expect(cards.length).toBe(3)
    }, { timeout: 500 })
  })

  it('limits insights to 3 when more are returned', async () => {
    const insights = Array.from({ length: 5 }, (_, i) => ({
      type: 'improved', headlineKey: `h${i}`, subKey: `s${i}`, lucideIcon: 'TrendingUp',
    }))
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ insights }) })
    const { container } = render(<DailyInsightStack mode="word_hunt" date="2026-05-12" />)
    await waitFor(() => {
      const cards = container.querySelectorAll('[data-testid="insight-card"]')
      expect(cards.length).toBe(3)
    }, { timeout: 500 })
  })

  it('passes correct mode and date to API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ insights: [] }) })
    global.fetch = fetchMock
    render(<DailyInsightStack mode="word_wheel" date="2026-05-13" />)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/daily/insights?mode=word_wheel&date=2026-05-13'
      )
    }, { timeout: 500 })
  })

  it('interpolates params in sub key', async () => {
    const insights = [
      {
        type: 'improved',
        headlineKey: 'h0',
        subKey: 'You found {count} words',
        subParams: { count: 42 },
        lucideIcon: 'TrendingUp',
      },
    ]
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ insights }) })
    const { container } = render(<DailyInsightStack mode="word_hunt" date="2026-05-12" />)
    await waitFor(() => {
      const card = container.querySelector('[data-testid="insight-card"]')
      expect(card?.textContent).toContain('You found 42 words')
    }, { timeout: 500 })
  })
})
