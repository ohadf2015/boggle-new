import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseTeacherAccess = vi.fn();
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => mockUseTeacherAccess(),
}));
const mockRouterReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace, push: mockRouterReplace }),
  usePathname: () => '/en/teacher/curriculum',
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

  it('renders nothing while loading', () => {
    mockUseTeacherAccess.mockReturnValue({ hasAccess: false, status: 'none', isLoading: true });
    const { container } = render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    expect(container.textContent).not.toContain('INSIDE');
  });
});
