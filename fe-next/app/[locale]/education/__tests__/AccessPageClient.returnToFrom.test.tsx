import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReplace = vi.fn();
let mockFrom: string | null = '/en/teacher';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mockFrom ? { from: mockFrom } : {}),
  usePathname: () => '/en/education/access',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/components/education/AccessRequestGate', () => ({ AccessRequestGate: () => null }));
vi.mock('@/components/education/DistrictUpsellStrip', () => ({ DistrictUpsellStrip: () => null }));
vi.mock('@/components/education/TrialUrgencyBanner', () => ({ TrialUrgencyBanner: () => null }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
vi.mock('@/lib/animation/useGsapReveal', () => ({ useGsapReveal: () => ({ current: null }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

let mockAccess = { hasAccess: true, status: 'approved', latestRequest: null, trial: null, isLoading: false };
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => mockAccess }));

import { PageClient } from '../access/PageClient';

describe('access page returns a teacher to the page TeacherGate bounced', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockFrom = '/en/teacher';
    mockAccess = { hasAccess: true, status: 'approved', latestRequest: null, trial: null, isLoading: false };
  });

  it('replaces back to ?from= once access resolves (signed in after the bounce)', () => {
    render(<PageClient />);
    expect(mockReplace).toHaveBeenCalledWith('/en/teacher');
  });

  it('waits while access is still resolving', () => {
    mockAccess = { ...mockAccess, isLoading: true };
    render(<PageClient />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('stays put without access, so the gate and this page never ping-pong', () => {
    mockAccess = { ...mockAccess, hasAccess: false, status: 'none' };
    render(<PageClient />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('stays put when status is approved but the profile has not caught up (the gate would bounce it again)', () => {
    mockAccess = { ...mockAccess, hasAccess: false, status: 'approved' };
    render(<PageClient />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('ignores an off-site ?from=', () => {
    mockFrom = '//evil.example/en/teacher';
    render(<PageClient />);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('a direct visit (marketing CTA, no ?from=) keeps the approved card instead of bouncing', () => {
    mockFrom = null;
    render(<PageClient />);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
