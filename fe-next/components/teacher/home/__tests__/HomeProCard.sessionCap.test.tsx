import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { claimProOfferSlot } from '@/lib/education/pro/proOfferSession';

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false }),
}));
const start = vi.fn();
vi.mock('@/hooks/useStartTeacherProTrial', () => ({ useStartTeacherProTrial: () => ({ start, pending: false }) }));
const impression = vi.fn();
const click = vi.fn();
vi.mock('@/lib/education/reportProCtaClick', () => ({
  reportProOfferImpression: (...a: unknown[]) => impression(...a),
  reportProOfferClick: (a: unknown) => click(a),
  reportProCtaClick: vi.fn(),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackTrialCtaView: vi.fn() }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-9' } }) }));

import { HomeProCard } from '../HomeProCard';

const t = (k: string) => k;
const renderCard = () => render(<HomeProCard kind="trial" onDismiss={vi.fn()} trackImpression language="en" t={t} />);

describe('HomeProCard session cap', () => {
  beforeEach(() => {
    impression.mockClear();
    click.mockClear();
    start.mockClear();
  });

  it('shows the full card when it is the first offer this session', () => {
    renderCard();
    expect(screen.getByTestId('home-pro-card')).toBeInTheDocument();
  });

  it('collapses to a one-line link that still starts checkout when another placement already showed the card', () => {
    claimProOfferSlot('teacher-9', 'results-mount');
    renderCard();
    expect(screen.queryByTestId('home-pro-card')).toBeNull();
    const link = screen.getByTestId('teacher-pro-offer-compact');
    expect(link).toHaveTextContent('Start your 14-day Teacher Pro trial');
    expect(impression).toHaveBeenCalledWith(expect.objectContaining({ placement: 'dashboard', format: 'link', stage: 'rendered' }), { userId: 'teacher-9' });
    expect(impression).not.toHaveBeenCalledWith(expect.not.objectContaining({ format: 'link' }), expect.anything());
    fireEvent.click(link);
    expect(click).toHaveBeenCalledWith(expect.objectContaining({ placement: 'dashboard', format: 'link' }));
    expect(start).toHaveBeenCalled();
  });
});
