import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/components/education/TeacherGate', () => ({ TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/education/shell/EducationShell', () => ({ EducationShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/ui/ConfirmationDialog', () => ({ ConfirmationDialog: () => null }));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({ classrooms: [{ id: 'c1', name: 'Room 4' }], isLoading: false, error: null }),
}));

import DeleteClassPageClient from '../PageClient';

afterEach(cleanup);

describe('Delete one class page', () => {
  it('Given a teacher lands here, Then it names the class, offers a way back, and keeps delete as the one red action', () => {
    render(<DeleteClassPageClient classroomId="c1" />);
    expect(screen.getByTestId('delete-class-name')).toHaveTextContent('Room 4');
    expect(screen.getByRole('link', { name: /education.analytics.backToClassroom/ })).toHaveAttribute('href', '/en/teacher/classroom');
    const del = screen.getByTestId('delete-class-affordance');
    expect(del.className).toMatch(/(^|\s)bg-neo-red(\s|$)/);
    expect(del.className).toMatch(/border-neo-black/);
  });
});
