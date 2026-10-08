import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeacherHqWelcome } from '../TeacherHqWelcome';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('../ProWelcomeCelebration', () => ({
  ProWelcomeCelebration: ({ paid, grant }: { paid?: boolean; grant: unknown }) => (
    <div data-testid="pro-welcome-celebration" data-paid={paid ? '1' : '0'} data-grant={grant ? '1' : '0'} />
  ),
}));
vi.mock('../TeacherTrialWelcome', () => ({
  TeacherTrialWelcome: ({ trialExpires }: { trialExpires: string | null }) => (
    <div data-testid="teacher-trial-welcome" data-expires={trialExpires ?? ''} />
  ),
}));

describe('TeacherHqWelcome', () => {
  const expires = '2026-10-22T00:00:00.000Z';

  it('shows the trial welcome instead of the paid celebration after a Polar trial checkout', () => {
    render(<TeacherHqWelcome welcomeKind="trial" grant={null} trialExpires={expires} />);
    expect(screen.getByTestId('teacher-trial-welcome')).toHaveAttribute('data-expires', expires);
    expect(screen.getByTestId('pro-welcome-celebration')).toHaveAttribute('data-paid', '0');
  });

  it('shows the paid celebration after a paid Polar checkout', () => {
    render(<TeacherHqWelcome welcomeKind="paid" grant={null} trialExpires={null} />);
    expect(screen.getByTestId('pro-welcome-celebration')).toHaveAttribute('data-paid', '1');
    expect(screen.queryByTestId('teacher-trial-welcome')).toBeNull();
  });
});
