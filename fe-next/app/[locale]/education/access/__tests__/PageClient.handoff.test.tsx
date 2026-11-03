import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const replace = vi.hoisted(() => vi.fn());
const fromParam = vi.hoisted(() => ({ value: null as string | null }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => fromParam.value }),
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/en/education/access',
}));

const access = vi.hoisted(() => ({
  state: { status: 'none', hasAccess: false, isLoading: false, latestRequest: null, trial: null } as Record<string, unknown>,
}));
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => access.state }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/animation/useGsapReveal', () => ({ useGsapReveal: () => ({ current: null }) }));
vi.mock('@/components/education/landing/LandingHeader', () => ({ LandingHeader: () => <header /> }));
vi.mock('@/components/education/shell/EducationShell', () => ({
  EducationShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/education/DistrictUpsellStrip', () => ({ DistrictUpsellStrip: () => null }));
vi.mock('@/components/education/TrialUrgencyBanner', () => ({ TrialUrgencyBanner: () => null }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: ({ text }: { text: string }) => <p>{text}</p> }));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test stub for next/image, never shipped
  default: (p: Record<string, unknown>) => <img alt={String(p.alt ?? '')} />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const approval = vi.hoisted(() => ({ value: { paidDay0: false, alreadyApproved: false } as Record<string, unknown> }));
vi.mock('@/components/education/AccessRequestGate', () => ({
  AccessRequestGate: ({ onApproved }: { onApproved?: (a: unknown) => void }) => (
    <button type="button" onClick={() => onApproved?.(approval.value)}>
      approve
    </button>
  ),
}));

import { PageClient } from '../PageClient';

function approveAndPromote(ready: Promise<void>) {
  approval.value = { ...approval.value, ready };
  act(() => screen.getByRole('button', { name: 'approve' }).click());
}

describe('access PageClient — the approved teacher goes straight to class setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromParam.value = null;
    approval.value = { paidDay0: false, alreadyApproved: false };
    access.state = { status: 'none', hasAccess: false, isLoading: false, latestRequest: null, trial: null };
  });

  it('Given a fresh approval, When the profile flips to teacher, Then the "already approved" card never shows and the page goes to class setup once', async () => {
    const { rerender } = render(<PageClient />);
    let finish: () => void = () => {};
    approveAndPromote(new Promise<void>((r) => { finish = r; }));

    access.state = { status: 'approved', hasAccess: true, isLoading: false, latestRequest: null, trial: null };
    rerender(<PageClient />);
    expect(screen.queryByText('education.access.already_approved_title')).toBeNull();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    await act(async () => { finish(); });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/teacher/classroom/new'));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('Given a TeacherGate bounce, When approved, Then only one navigation fires, to where the teacher was heading', async () => {
    fromParam.value = '/en/teacher/reports';
    const { rerender } = render(<PageClient />);
    approveAndPromote(Promise.resolve());
    access.state = { status: 'approved', hasAccess: true, isLoading: false, latestRequest: null, trial: null };
    rerender(<PageClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/teacher/reports'));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('Given a paid campaign teacher, Then the day-0 class is opened', async () => {
    approval.value = { paidDay0: true, alreadyApproved: false };
    render(<PageClient />);
    approveAndPromote(Promise.resolve());
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/teacher/class-ready'));
  });

  it('Given the pitch, Then it promises a class, not a review: no queue wording and no email-confirm step', () => {
    render(<PageClient />);
    expect(screen.queryByText('education.access.trust_instant')).toBeNull();
    expect(screen.queryByText(/education\.access\.next\.step2/)).toBeNull();
    expect(screen.getAllByText('teacher.classroom.wizard.subtitle').length).toBeGreaterThan(0);
  });
});
