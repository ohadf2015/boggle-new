import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoveAdsProbe } from '../RemoveAdsProbe';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

describe('RemoveAdsProbe', () => {
  beforeEach(() => mockTrackGrowthEvent.mockClear());

  it('renders title and body', () => {
    render(<RemoveAdsProbe isDarkMode={false} />);
    expect(screen.getByText('settings.removeAds.title')).toBeInTheDocument();
    expect(screen.getByText('settings.removeAds.body')).toBeInTheDocument();
  });

  it('fires iap_viewed on mount', () => {
    render(<RemoveAdsProbe isDarkMode={false} />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', { surface: 'settings' });
  });

  it('fires iap_tapped on button click', () => {
    render(<RemoveAdsProbe isDarkMode={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'settings.removeAds.button' }));
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_tapped', { surface: 'settings', intent: 'remove_ads' });
  });

  it('renders coming-soon label after click', () => {
    render(<RemoveAdsProbe isDarkMode={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'settings.removeAds.button' }));
    expect(screen.getByText('settings.removeAds.comingSoon')).toBeInTheDocument();
  });
});
