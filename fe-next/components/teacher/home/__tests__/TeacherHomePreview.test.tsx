import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderToString } from 'react-dom/server';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/teacher/preview',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/education/shell/TeacherAccountMenu', async () => {
  const { useAuth } = await import('@/contexts/AuthContext');
  return { TeacherAccountMenu: () => <span data-testid="account-user">{useAuth().user?.id ?? ''}</span> };
});
const viewed = vi.fn();
vi.mock('@/lib/education/telemetry', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  trackEduTeacherDashboardViewed: (s: unknown) => viewed(s),
}));

import { TeacherHomePreview } from '../TeacherHomePreview';

afterEach(cleanup);

describe('TeacherHomePreview', () => {
  it('Given the class desk state, Then the real home grid shows the class, its week and the session rail', () => {
    render(<TeacherHomePreview state="classes" />);
    const home = screen.getByTestId('teacher-home');
    expect(within(home).getAllByText('5B - English').length).toBeGreaterThan(0);
    expect(within(home).getByTestId('home-weekly-reports')).toBeInTheDocument();
    expect(viewed).not.toHaveBeenCalled();
  });

  it('Given the class desk state, Then This week lists every class with the desk class pressed', () => {
    render(<TeacherHomePreview state="classes" />);
    const roster = within(screen.getByTestId('home-week')).getByTestId('home-week-classes');
    expect(within(roster).getAllByRole('button')).toHaveLength(3);
    expect(within(roster).getByRole('button', { name: /5B - English/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Given the class desk state, Then a roster lists every student of the desk class with a status', () => {
    render(<TeacherHomePreview state="classes" />);
    const roster = screen.getByTestId('home-roster');
    expect(within(roster).getAllByTestId('home-roster-row')).toHaveLength(28);
    expect(within(roster).getByTestId('home-roster-summary')).toBeInTheDocument();
  });

  it('Given the class desk state, Then Pick a game is the only filled action and no rail list repeats the Behind students', () => {
    render(<TeacherHomePreview state="classes" />);
    expect(screen.queryByTestId('home-focus')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('home-roster')).getAllByTestId('home-roster-assign-all')).toHaveLength(1);
    for (const a of screen.getAllByTestId('home-roster-assign')) expect(a).not.toHaveClass('bg-neo-yellow');
  });

  it('Given the class desk state, Then the account avatar belongs to the preview teacher, not a blank seed', () => {
    render(<TeacherHomePreview state="classes" />);
    for (const u of screen.getAllByTestId('account-user')) expect(u).toHaveTextContent('preview-teacher-dana');
  });

  it('Given the class desk state, Then the hero carries no filler insight and no free-class line', () => {
    render(<TeacherHomePreview state="classes" />);
    expect(screen.queryByTestId('home-insight')).not.toBeInTheDocument();
    expect(screen.queryByTestId('home-class-cap')).not.toBeInTheDocument();
  });

  it('Given the empty state, Then a new teacher sees the onboarding card, not a class desk', () => {
    render(<TeacherHomePreview state="empty" />);
    expect(screen.getByTestId('home-onboarding')).toBeInTheDocument();
    expect(screen.queryByText('5B - English')).not.toBeInTheDocument();
  });

  it('Given a server render, Then it paints the skeleton so browser-only reads cannot mismatch hydration', () => {
    const html = renderToString(<TeacherHomePreview state="classes" />);
    expect(html).toContain('home-skeleton');
    expect(html).not.toContain('5B - English');
  });

  it('Given the loading state, Then it paints the skeleton', () => {
    render(<TeacherHomePreview state="loading" />);
    expect(screen.getByTestId('home-skeleton')).toBeInTheDocument();
  });
});
