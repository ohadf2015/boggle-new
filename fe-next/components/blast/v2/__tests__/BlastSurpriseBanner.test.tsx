import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BlastSurpriseBanner } from '../BlastSurpriseBanner';
import type { ActiveSurprise } from '@/lib/blast/v2/surprise';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

describe('BlastSurpriseBanner', () => {
  it('renders nothing when there is no active surprise', () => {
    const { container } = render(<BlastSurpriseBanner surprise={null} modeColor="#BFFF00" />);
    expect(container.querySelector('[data-testid="surprise-banner"]')).toBeNull();
  });

  it('shows the event and a coin reward when a coin_burst fires', async () => {
    const surprise: ActiveSurprise = { event: 'coin_burst', coins: 75, chestProgress: 0, key: 1 };
    render(<BlastSurpriseBanner surprise={surprise} modeColor="#BFFF00" />);
    const banner = await waitFor(() => screen.getByTestId('surprise-banner'));
    expect(banner.getAttribute('data-event')).toBe('coin_burst');
    expect(banner.textContent).toContain('+75');
  });

  it('shows a chest-percentage reward for a gem_shower', async () => {
    const surprise: ActiveSurprise = { event: 'gem_shower', coins: 0, chestProgress: 0.12, key: 2 };
    render(<BlastSurpriseBanner surprise={surprise} modeColor="#00FFFF" />);
    const banner = await waitFor(() => screen.getByTestId('surprise-banner'));
    expect(banner.textContent).toContain('+12%');
  });

  it('shows the ×2 charge line for a lucky_double', async () => {
    const surprise: ActiveSurprise = { event: 'lucky_double', coins: 0, chestProgress: 0, key: 3 };
    render(<BlastSurpriseBanner surprise={surprise} modeColor="#FF1493" />);
    const banner = await waitFor(() => screen.getByTestId('surprise-banner'));
    expect(banner.getAttribute('data-event')).toBe('lucky_double');
    expect(banner.textContent).toContain('×2');
  });
});
