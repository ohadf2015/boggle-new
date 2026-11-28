import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('../HomeShareSheet', () => ({ HomeShareSheet: () => null }));
vi.mock('@/components/teacher/ClassLimitUpsellModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="plan-gate-upgrade">Upgrade</div> : null),
}));

import { HomeHero } from '../HomeHero';

const t = (k: string) => k;
const A = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 4 };
const B = { id: 'c2', name: 'Period 5', join_code: 'ZZ99YY', member_count: 2 };
const C = { id: 'c3', name: 'Period 7', join_code: 'QQ11WW', member_count: 6 };
const openMenu = () => fireEvent.pointerDown(screen.getByTestId('home-class-switcher'), { button: 0, ctrlKey: false, pointerType: 'mouse' });

describe('<HomeHero> class menu', () => {
  it('Given a selected class, Then the class page and New class live in the menu on the class name, not on the desk', () => {
    render(<HomeHero classrooms={[A, B]} selectedId="c2" onSelect={vi.fn()} language="he" t={t} newClassHref="/he/teacher/classroom/new" classesHref="/he/teacher/classroom" meta={<span data-testid="meta">4</span>} />);
    expect(screen.queryByTestId('home-class-page')).toBeNull();
    expect(screen.queryByTestId('home-new-class')).toBeNull();
    expect(screen.getByTestId('home-hero-meta-row')).toContainElement(screen.getByTestId('meta'));
    openMenu();
    expect(screen.getByTestId('home-class-page')).toHaveAttribute('href', '/he/teacher/classroom/c2');
    expect(screen.getByTestId('home-class-page')).toHaveTextContent('eduShell.home.classPage');
    expect(screen.getByTestId('home-new-class')).toHaveAttribute('href', '/he/teacher/classroom/new');
    expect(screen.getByTestId('home-all-classes')).toHaveAttribute('href', '/he/teacher/classroom');
  });

  it('Given one class, Then the heading is named by the class, not by the menu', () => {
    render(<HomeHero classrooms={[A]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} newClassHref="/en/teacher/classroom/new" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveAccessibleName('Period 3');
    expect(screen.getByTestId('home-class-switcher')).not.toHaveAttribute('aria-label');
  });

  it('Given one class, Then the same menu still reaches its page and New class, with no class list', () => {
    render(<HomeHero classrooms={[A]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} newClassHref="/en/teacher/classroom/new" />);
    openMenu();
    expect(screen.getByTestId('home-class-page')).toHaveAttribute('href', '/en/teacher/classroom/c1');
    expect(screen.queryByTestId('home-class-option')).toBeNull();
    expect(screen.getAllByTestId('home-start-live')).toHaveLength(1);
  });

  it('Given a teacher at the free class cap, When they pick New class, Then the upgrade prompt opens instead of the new-class page', () => {
    render(<HomeHero classrooms={[A, B, C]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} newClassHref="/en/teacher/classroom/new" classLimit={3} />);
    openMenu();
    const cta = screen.getByTestId('home-new-class');
    expect(cta).not.toHaveAttribute('href');
    fireEvent.click(cta);
    expect(screen.getByTestId('plan-gate-upgrade')).toBeInTheDocument();
  });

  it('Given the class page itself, Then the name is plain text with no menu', () => {
    render(<HomeHero classrooms={[A]} selectedId="c1" onSelect={vi.fn()} language="en" t={t} classPageLink={false} />);
    expect(screen.getByTestId('home-class-switcher').tagName).toBe('SPAN');
  });
});
