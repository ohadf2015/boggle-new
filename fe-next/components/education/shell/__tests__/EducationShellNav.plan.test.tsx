import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EducationShellNav } from '../EducationShellNav';
import { resolveEducationNav } from '../navItems';

const pro = vi.hoisted(() => ({ current: { hasPro: false, loading: false, known: true, status: null as string | null } }));

vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro.current }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', isRTL: false }),
}));
vi.mock('../TeacherAccountMenu', () => ({
  TeacherAccountMenu: ({ plan }: { plan?: string }) => <button data-testid="account" data-plan={plan ?? ''} />,
}));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  pro.current = { hasPro: false, loading: false, known: true, status: null };
});

const nav = resolveEducationNav('/en/teacher/classroom')!;

describe('teacher top bar plan status (phone and tablet)', () => {
  it.each([
    ['free', { hasPro: false, status: null }, 'teacher.plan.upgrade'],
    ['trial', { hasPro: true, status: 'trialing' }, 'teacher.plan.trialActive'],
    ['pro', { hasPro: true, status: 'active' }, 'teacher.plan.pro'],
  ] as const)('Given a %s teacher, When the top bar shows, Then it names the plan and links to plans', (_, state, label) => {
    pro.current = { loading: false, known: true, ...state };
    const { getByTestId } = render(<EducationShellNav nav={nav} variant="topbar" />);
    const chip = within(getByTestId('teacher-topbar')).getByTestId('teacher-plan-chip');
    expect(chip).toHaveTextContent(label);
    expect(chip).toHaveAttribute('href', '/en/teacher/upgrade');
    expect(chip.className).toMatch(/min-h-\[44px\]/);
  });

  it('Given a Pro teacher, When the top bar shows, Then the chip is the gold Pro mark and the avatar menu stays plain', () => {
    pro.current = { hasPro: true, loading: false, known: true, status: 'active' };
    const { getByTestId } = render(<EducationShellNav nav={nav} variant="topbar" />);
    expect(getByTestId('teacher-plan-chip').querySelector('[data-pro-badge]')).not.toBeNull();
    expect(getByTestId('account')).toHaveAttribute('data-plan', '');
  });

  it('Given a free teacher, When the top bar shows, Then the chip is quiet: no filled pill', () => {
    const { getByTestId } = render(<EducationShellNav nav={nav} variant="topbar" />);
    expect(getByTestId('teacher-plan-chip').innerHTML).not.toMatch(/bg-neo-cream|shadow-hard/);
  });

  it.each([
    ['pro', { hasPro: true, status: 'active' }],
    ['trial', { hasPro: true, status: 'trialing' }],
  ] as const)('Given a %s teacher on desktop, When the sidebar shows, Then the account row alone states the plan', (plan, state) => {
    pro.current = { loading: false, known: true, ...state };
    const { getByTestId, queryByTestId } = render(<EducationShellNav nav={nav} variant="sidebar" />);
    expect(getByTestId('account')).toHaveAttribute('data-plan', plan);
    expect(queryByTestId('education-side-pro')).toBeNull();
  });

  it('Given the plan is still loading, When the top bar shows, Then it claims nothing', () => {
    pro.current = { hasPro: false, loading: true, known: false, status: null };
    const { queryByTestId } = render(<EducationShellNav nav={nav} variant="topbar" />);
    expect(queryByTestId('teacher-plan-chip')).toBeNull();
  });
});
