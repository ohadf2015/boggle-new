import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    isRTL: false,
    language: 'en',
    dir: 'ltr',
  }),
}))

import WeeklyChestInfoModal from '../WeeklyChestInfoModal'

describe('WeeklyChestInfoModal', () => {
  it('renders as an accessible dialog with the explainer title', () => {
    render(
      <WeeklyChestInfoModal projectedTier="silver" weekScore={55} onClose={vi.fn()} />,
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('daily.weeklyChest.info.title')).toBeTruthy()
  })

  it('explains that missing a day resets the streak', () => {
    render(
      <WeeklyChestInfoModal projectedTier="bronze" weekScore={10} onClose={vi.fn()} />,
    )
    expect(screen.getByText('daily.weeklyChest.info.streakReset')).toBeTruthy()
  })

  it('describes all three chest tiers', () => {
    render(
      <WeeklyChestInfoModal projectedTier="gold" weekScore={90} onClose={vi.fn()} />,
    )
    expect(screen.getByText('daily.weeklyChest.info.tierBronzeDesc')).toBeTruthy()
    expect(screen.getByText('daily.weeklyChest.info.tierSilverDesc')).toBeTruthy()
    expect(screen.getByText('daily.weeklyChest.info.tierGoldDesc')).toBeTruthy()
  })

  it('shows the current projected tier', () => {
    render(
      <WeeklyChestInfoModal projectedTier="gold" weekScore={90} onClose={vi.fn()} />,
    )
    const projection = screen.getByTestId('chest-info-projection')
    expect(projection.textContent || '').toContain('daily.weeklyChest.tierGold')
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <WeeklyChestInfoModal projectedTier="silver" weekScore={55} onClose={onClose} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'daily.weeklyChest.info.gotIt' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
