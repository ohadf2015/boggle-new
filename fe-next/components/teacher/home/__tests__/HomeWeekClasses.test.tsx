import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomeWeekClasses } from '../HomeWeekClasses';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const NOW = Date.parse('2026-11-04T15:00:00');
const rows = [
  { id: 'a', name: '5B - English', tone: 'today' as const, playedAt: new Date(NOW - 3_600_000).toISOString() },
  { id: 'b', name: '4A - Reading', tone: 'idle' as const, playedAt: null },
];

afterEach(cleanup);

describe('HomeWeekClasses', () => {
  it('Then each class is a button that marks the class on the desk as pressed', () => {
    render(<HomeWeekClasses rows={rows} hidden={0} selectedId="a" onSelect={() => undefined} moreHref="/en/teacher/classroom" language="en" nowMs={NOW} t={t} />);
    const list = screen.getByTestId('home-week-classes');
    const buttons = within(list).getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('When a teacher picks another class, Then the desk switches to it', () => {
    const onSelect = vi.fn();
    render(<HomeWeekClasses rows={rows} hidden={0} selectedId="a" onSelect={onSelect} moreHref="/en/teacher/classroom" language="en" nowMs={NOW} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: /4A - Reading/ }));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('Then a played class shows when, and an idle class says it had no game this week', () => {
    render(<HomeWeekClasses rows={rows} hidden={0} selectedId="a" onSelect={() => undefined} moreHref="/en/teacher/classroom" language="en" nowMs={NOW} t={t} />);
    const [played, idle] = screen.getAllByTestId('home-week-class-when');
    expect(played).toHaveTextContent('today');
    expect(idle).toHaveTextContent('eduShell.week.idle');
    expect(screen.getAllByTestId('home-week-class-dot').map((d) => d.dataset.tone)).toEqual(['today', 'idle']);
  });

  it('Given hidden classes, Then a link to the class list counts them; with none hidden it is absent', () => {
    const { rerender } = render(<HomeWeekClasses rows={rows} hidden={3} selectedId="a" onSelect={() => undefined} moreHref="/en/teacher/classroom" language="en" nowMs={NOW} t={t} />);
    expect(screen.getByRole('link', { name: 'eduShell.week.more:{"count":3}' })).toHaveAttribute('href', '/en/teacher/classroom');
    rerender(<HomeWeekClasses rows={rows} hidden={0} selectedId="a" onSelect={() => undefined} moreHref="/en/teacher/classroom" language="en" nowMs={NOW} t={t} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('Then class names render with auto direction so a Hebrew name reads right-to-left inside an English page', () => {
    render(<HomeWeekClasses rows={rows} hidden={0} selectedId="a" onSelect={() => undefined} moreHref="/en/teacher/classroom" language="en" nowMs={NOW} t={t} />);
    expect(screen.getByText('5B - English')).toHaveAttribute('dir', 'auto');
  });
});

describe('HomeWeekClasses as chunky pills', () => {
  it('Then the picked class is a cream pill with dark text and a hard shadow, the others sit flat with a border', () => {
    render(<HomeWeekClasses rows={rows} hidden={0} selectedId="a" onSelect={() => undefined} moreHref="/en/teacher/classroom" language="en" nowMs={NOW} t={t} />);
    const [picked, other] = within(screen.getByTestId('home-week-classes')).getAllByRole('button');
    expect(picked.className).toMatch(/(^|\s)bg-neo-cream(\s|$)/);
    expect(picked.className).toContain('shadow-hard');
    expect(picked.className).toContain('rounded-full');
    expect(within(picked).getAllByText(/./).every((el) => !/text-neo-cream(\/|\s|$)/.test(el.className))).toBe(true);
    expect(other.className).not.toMatch(/(^|\s)bg-neo-cream(\s|$)/);
    expect(other.className).toContain('rounded-full');
    expect(other.className).toMatch(/border-2/);
  });
});

