import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const search = vi.hoisted(() => ({ value: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search.value) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));
vi.mock('@/components/education/shell/EducationShell', () => ({
  EducationShell: ({ tabs, children }: { tabs?: boolean; children: React.ReactNode }) => <div data-testid="shell" data-tabs={String(tabs ?? true)}>{children}</div>,
}));
vi.mock('@/components/education/TeacherGate', () => ({ TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/teacher/motion/useTeacherReveal', () => ({ useTeacherReveal: () => null }));
vi.mock('@/components/education/ClassSetupInvite', () => ({ ClassSetupInvite: () => <div data-testid="ready" /> }));
vi.mock('@/components/teacher/setup/ClassSetupCreate', () => ({ ClassSetupCreate: () => <div data-testid="create" /> }));

import NewClassPageClient from '../PageClient';

describe('new class page shell', () => {
  it('Given the ready step, Then the phone tab bar steps aside so the code, the words and Play now fit one screen', () => {
    search.value = 'classroomId=c1';
    render(<NewClassPageClient />);
    expect(screen.getByTestId('ready')).toBeInTheDocument();
    expect(screen.getByTestId('shell')).toHaveAttribute('data-tabs', 'false');
  });

  it('Given the create step, Then the tab bar stays', () => {
    search.value = '';
    render(<NewClassPageClient />);
    expect(screen.getByTestId('create')).toBeInTheDocument();
    expect(screen.getByTestId('shell')).toHaveAttribute('data-tabs', 'true');
  });
});
