/**
 * DailyRedirect renders the /daily quest-selection hub for EVERY player —
 * including returning players with unplayed quests. Ohad (2026-07-29): the
 * once-per-session auto-skip into Word Hunt was wrong; the hub itself (with
 * one-tap quest cards) is the intended fast path. router.replace must never
 * fire from this component.
 */
import { render, screen } from '@testing-library/react';
import DailyRedirect from '../DailyRedirect';

const replace = vi.fn();
const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace, push })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/components/Header', () => ({ default: () => <div>HEADER</div> }));
vi.mock('../DailyChallengeLanding', () => ({
  DailyChallengeLanding: () => <div data-testid="daily-landing">LANDING</div>,
}));

vi.mock('@/hooks/useDailyRivalChallenge', () => ({
  useDailyRivalChallenge: vi.fn(),
}));

describe('DailyRedirect — always shows the hub (no auto-redirect)', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
  });

  it('renders the quest-selection hub immediately', () => {
    render(<DailyRedirect />);
    expect(screen.getByTestId('daily-landing')).toBeInTheDocument();
  });

  it('never auto-redirects into a quest', () => {
    render(<DailyRedirect />);
    expect(replace).not.toHaveBeenCalled();
  });
});
