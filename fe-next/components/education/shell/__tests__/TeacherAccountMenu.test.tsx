import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const push = vi.fn();
const signOut = vi.fn().mockResolvedValue(undefined);

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { display_name: 'Dana Levi', user_role: 'teacher', avatar_config: { bgColor: '#123456' } },
    user: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', email: 'dana@school.test' },
  }),
}));
vi.mock('@/lib/supabase', () => ({ signOut: () => signOut() }));
vi.mock('@/components/teacher/TeacherWhatsNew', () => ({
  TeacherWhatsNewDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog">whats-new</div> : null),
}));

import { TeacherAccountMenu } from '../TeacherAccountMenu';

afterEach(() => {
  cleanup();
  push.mockReset();
});

async function openMenu() {
  await userEvent.click(screen.getByTestId('teacher-account-trigger'));
  return screen.findByRole('menu');
}

describe('<TeacherAccountMenu>', () => {
  it('Given a teacher, When the avatar is shown, Then it is the shared avatar with an accessible name', () => {
    render(<TeacherAccountMenu proHref="/he/teacher/upgrade" profileHref="/he/teacher/profile" />);
    const trigger = screen.getByTestId('teacher-account-trigger');
    const avatar = screen.getByTestId('avatar-lite');
    expect(avatar).toHaveAttribute('data-user-id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
    expect(avatar).toHaveAttribute('data-has-custom', 'true');
    expect(trigger).not.toHaveTextContent('DL');
    expect(trigger).toHaveAccessibleName('eduShell.account.menuLabel');
  });

  it('When opened, Then it lists Profile, Help, What’s new, Pro, Sign out and Exit education in the locale', async () => {
    render(<TeacherAccountMenu proHref="/he/teacher/upgrade" profileHref="/he/teacher/profile" />);
    await openMenu();
    expect(screen.getByRole('menuitem', { name: /eduShell.account.profile/ })).toHaveAttribute('href', '/he/teacher/profile');
    expect(screen.getByRole('menuitem', { name: /eduShell.account.help/ })).toHaveAttribute('href', '/he/education/help');
    expect(screen.getByRole('menuitem', { name: /eduShell.account.whatsNew/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /eduShell.nav.pro/ })).toHaveAttribute('href', '/he/teacher/upgrade');
    expect(screen.getByRole('menuitem', { name: /auth.signOut/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /education.header.exitEducation/ })).toHaveAttribute('href', '/he');
    const hrefs = Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'));
    expect(hrefs.filter((h) => h === '/he')).toHaveLength(1);
    for (const h of hrefs) expect(h).toMatch(/^\/he(\/|$)/);
  });

  it('When What’s new is chosen, Then the changelog dialog opens', async () => {
    render(<TeacherAccountMenu proHref="/he/teacher/upgrade" profileHref="/he/teacher/profile" />);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /eduShell.account.whatsNew/ }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('whats-new');
  });

  it('When Sign out is chosen, Then the session ends and the teacher lands on the education landing', async () => {
    render(<TeacherAccountMenu proHref="/he/teacher/upgrade" profileHref="/he/teacher/profile" />);
    await openMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /auth.signOut/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/he/education'));
    expect(signOut).toHaveBeenCalled();
  });
  it('When opened, Then the Pro item is a neutral row that names plans and carries only a small PRO badge', async () => {
    render(<TeacherAccountMenu proHref="/he/teacher/upgrade" profileHref="/he/teacher/profile" />);
    await openMenu();
    const item = screen.getByRole('menuitem', { name: /eduShell.account.plans/ });
    expect(item).toHaveAttribute('href', '/he/teacher/upgrade');
    expect(item.className).not.toContain('text-neo-yellow');
    expect(item.querySelector('[data-testid="teacher-account-pro-badge"]')).toHaveTextContent('eduShell.nav.pro');
  });
});
