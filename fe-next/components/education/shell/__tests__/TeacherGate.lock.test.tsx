import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

const mockUseTeacherAccess = vi.fn();
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => mockUseTeacherAccess() }));
let mockVariant = 'control';
vi.mock('@/hooks/useExperiment', () => ({ useExperiment: () => ({ variant: mockVariant, trackExposure: vi.fn() }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/he/teacher',
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));

import { TeacherGate } from '../../TeacherGate';

describe('TeacherGate holding screens', () => {
  it.each([
    ['loading', { hasAccess: false, status: 'none', isLoading: true }, 'control'],
    ['redirecting', { hasAccess: false, status: 'none', isLoading: false }, 'redirect-status'],
  ] as const)('%s is height-locked, never page-growing', (_, access, variant) => {
    mockVariant = variant;
    mockUseTeacherAccess.mockReturnValue(access);
    const { container } = render(<TeacherGate><div>INSIDE</div></TeacherGate>);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('h-dvh');
    expect(root.className).not.toMatch(/min-h-(dvh|screen)/);
  });
});
