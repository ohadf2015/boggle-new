import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let profile: Record<string, unknown> | null = null;
let pathname = '/en';
const cg = { isOnCrazyGamesPlatform: false, isLoading: false };

vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => cg }));

import HeaderClassButton from '../HeaderClassButton';

describe('HeaderClassButton', () => {
  beforeEach(() => {
    profile = null;
    pathname = '/en';
    cg.isOnCrazyGamesPlatform = false;
    cg.isLoading = false;
  });

  it('Given a teacher on any page, Then a solid My classroom button links to the dashboard on phones', () => {
    profile = { user_role: 'teacher' };
    render(<HeaderClassButton />);
    const link = screen.getByTestId('header-my-class');
    expect(link).toHaveAttribute('href', '/en/teacher');
    expect(link).toHaveTextContent('education.nav.myClassroom');
    expect(link.className).toMatch(/\bsm:hidden\b/);
    expect(link.className).toMatch(/\bbg-neo-cyan\b/);
  });

  it('Given an admin, Then they get the same entry', () => {
    profile = { user_role: 'student', is_admin: true };
    render(<HeaderClassButton />);
    expect(screen.getByTestId('header-my-class')).toBeInTheDocument();
  });

  it('Given a player or a guest, Then nothing renders (the drawer keeps the For teachers link)', () => {
    profile = { user_role: 'student' };
    const { rerender } = render(<HeaderClassButton />);
    expect(screen.queryByTestId('header-my-class')).toBeNull();
    profile = null;
    rerender(<HeaderClassButton />);
    expect(screen.queryByTestId('header-my-class')).toBeNull();
  });

  it('Given the teacher is already inside the dashboard, Then the button steps aside', () => {
    profile = { user_role: 'teacher' };
    pathname = '/en/teacher/classroom/abc';
    render(<HeaderClassButton />);
    expect(screen.queryByTestId('header-my-class')).toBeNull();
  });

  it('Given the CrazyGames embed, Then it never links off-platform', () => {
    profile = { user_role: 'teacher' };
    cg.isOnCrazyGamesPlatform = true;
    render(<HeaderClassButton />);
    expect(screen.queryByTestId('header-my-class')).toBeNull();
  });
});
