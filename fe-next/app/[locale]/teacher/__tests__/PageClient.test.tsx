import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => ({ trial: null }) }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div /> }));
vi.mock('@/components/teacher/TeacherDashboard', () => ({ default: () => <div data-testid="teacher-dashboard" /> }));
vi.mock('@/components/teacher/DistrictUpsellBanner', () => ({ DistrictUpsellBanner: () => <div /> }));
vi.mock('@/components/education/TrialUrgencyBanner', () => ({ TrialUrgencyBanner: () => null }));
vi.mock('@/components/education/TeacherGate', () => ({
  TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('lucide-react', () => ({ Shield: () => null, ArrowLeft: () => null }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button> }));

import * as AuthContext from '@/contexts/AuthContext';
import TeacherPage from '../PageClient';

const mockUseAuth = AuthContext.useAuth as ReturnType<typeof vi.fn>;

const teacherProfile = { user_role: 'teacher' as const, is_admin: false };
const adminProfile  = { user_role: 'admin' as const,   is_admin: true  };

describe('TeacherPage upgrade CTA', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows upgrade link for non-admin teacher', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: teacherProfile, isAdmin: false, loading: false });
    render(<TeacherPage />);
    const link = screen.getByRole('link', { name: /teacher\.upgradePro\.cta/i });
    expect(link).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('hides upgrade link for admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, profile: adminProfile, isAdmin: true, loading: false });
    render(<TeacherPage />);
    expect(screen.queryByRole('link', { name: /teacher\.upgradePro\.cta/i })).toBeNull();
  });
});
