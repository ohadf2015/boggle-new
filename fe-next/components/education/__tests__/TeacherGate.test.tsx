import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseTeacherAccess = vi.fn();
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => mockUseTeacherAccess(),
}));
let mockRedirectVariant = 'control';
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: mockRedirectVariant, trackExposure: vi.fn() }),
}));
const mockRouterReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace, push: mockRouterReplace }),
  usePathname: () => '/en/teacher/curriculum',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { TeacherGate } from '../TeacherGate';

describe('<TeacherGate>', () => {
  it('renders children when hasAccess', () => {
    mockUseTeacherAccess.mockReturnValue({ hasAccess: true, status: 'approved', isLoading: false });
    render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(screen.getByText('INSIDE')).toBeInTheDocument();
  });

  it('redirects to /education/access when no access', () => {
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: false });
    render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(mockRouterReplace).toHaveBeenCalledWith(expect.stringContaining('/education/access?from='));
    expect(screen.queryByText('INSIDE')).toBeNull();
  });

  // A blank page while auth resolves reads as "the dashboard failed to load" —
  // the children's own loader is below this gate and never gets to mount.
  it('shows a loader (not a blank page, not the children) while loading', () => {
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: true });
    const { container } = render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(container.textContent).not.toContain('INSIDE');
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('does not redirect while loading', () => {
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: true });
    render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  // exp-teacher-gate-redirect-clarity-v1: control renders null during the
  // redirect hop (status quo, matches the rage-click signal on /en/teacher).
  it('control variant renders nothing while redirecting', () => {
    mockRedirectVariant = 'control';
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: false });
    const { container } = render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(container.firstChild).toBeNull();
  });

  it('redirect-status variant shows a loader instead of a blank screen while redirecting', () => {
    mockRedirectVariant = 'redirect-status';
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: false });
    render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(screen.getByText('common.loading')).toBeInTheDocument();
    mockRedirectVariant = 'control';
  });
});
