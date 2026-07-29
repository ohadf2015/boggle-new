/**
 * The referrals dashboard should render the global game Header (logo + nav +
 * auth/menu) like the rest of the app. It previously had only a bespoke sticky
 * title bar with a lone back button and no global navigation.
 */
import { render, screen } from '@testing-library/react';
import ReferralDashboardClient from '../PageClient';

vi.mock('@/components/Header', () => ({
  default: () => <div data-testid="game-header">HEADER</div>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, loading: false }),
}));
vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackShare: vi.fn() }));
vi.mock('@/components/auth/AuthModal', () => ({ default: () => null }));
vi.mock('@/hooks/useReferralDashboard', () => ({
  useReferralDashboard: () => ({
    data: {
      totalInvited: 3,
      totalJoined: 2,
      coinsEarned: 100,
      referralCode: 'ABC123',
      shareUrl: 'https://lexiclash.live/r/ABC123',
      milestones: [],
      referrals: [],
    },
    isLoading: false,
    error: null,
    copied: false,
    handleCopy: vi.fn(),
  }),
}));

describe('Referrals — global header', () => {
  it('renders the global game Header', () => {
    render(<ReferralDashboardClient />);
    expect(screen.getByTestId('game-header')).toBeInTheDocument();
  });

  it('drops the duplicate in-page back button (Header now provides back)', () => {
    render(<ReferralDashboardClient />);
    // The old bespoke bar exposed a back button via the common.back aria-label.
    // After the refactor, back navigation lives inside the (mocked) Header only.
    expect(screen.queryByLabelText('common.back')).not.toBeInTheDocument();
  });
});
