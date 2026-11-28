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

  it('does not redirect a Polar checkout return, so the teacher can sign in and finish activating Pro', () => {
    window.history.pushState({}, '', '/en/teacher/curriculum?checkout=success&checkout_id=4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a');
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: false });
    render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(mockRouterReplace).not.toHaveBeenCalled();
    window.history.pushState({}, '', '/');
  });

  // A blank page while auth resolves reads as "the dashboard failed to load" —
  // the children's own loader is below this gate and never gets to mount.
  it('shows a loader (not a blank page, not the children) while loading', () => {
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: true });
    const { container } = render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(container.textContent).not.toContain('INSIDE');
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('uses loadingFallback when the caller reserved chrome', () => {
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: true });
    render(
      <TeacherGate loadingFallback={<div data-testid="reserved-chrome">chrome</div>}>
        <div>INSIDE</div>
      </TeacherGate>,
    );
    expect(screen.getByTestId('reserved-chrome')).toBeInTheDocument();
    expect(screen.queryByText('INSIDE')).toBeNull();
    expect(screen.queryByText('common.loading')).toBeNull();
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
