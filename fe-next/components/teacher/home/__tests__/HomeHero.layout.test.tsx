import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/teacher/hq/HqProjectorSheet', () => ({ HqProjectorSheet: () => null }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

import { HomeHero } from '../HomeHero';

const t = (k: string) => k;
const CLASS = { id: 'c1', name: 'Period 3', join_code: 'AB12CD', member_count: 1 };

function renderHero(extra: Partial<React.ComponentProps<typeof HomeHero>> = {}) {
  return render(
    <HomeHero
      classrooms={[CLASS]}
      selectedId="c1"
      onSelect={vi.fn()}
      language="en"
      t={t}
      rehearse={<button type="button" data-testid="rehearse">bots</button>}
      {...extra}
    />,
  );
}

const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('<HomeHero> layout', () => {
  it('Then the desk reads top to bottom: the class, Start, the one big secondary, then the join row', () => {
    renderHero();
    const title = screen.getByRole('heading', { level: 2 });
    const start = screen.getByTestId('home-start-live');
    const second = screen.getByTestId('rehearse');
    const join = screen.getByTestId('home-join-row');
    expect(before(title, start)).toBe(true);
    expect(before(start, second)).toBe(true);
    expect(before(second, join)).toBe(true);
  });

  it('Then the hero is one calm navy panel with no colored panel inside it', () => {
    renderHero();
    const hero = screen.getByTestId('home-hero');
    expect(hero.className).not.toMatch(/(^|\s)bg-neo-(pink|purple|yellow)(\s|$)/);
    expect(screen.getByTestId('home-join-row').className).not.toMatch(/bg-neo-(yellow|pink|purple|cyan)/);
  });

  it('Then Start spans the column and the secondary sits in the same stack', () => {
    renderHero();
    const startRow = screen.getByTestId('home-hero-start-row');
    expect(startRow.className).toMatch(/(^|\s)flex-col(\s|$)/);
    expect(screen.getByTestId('home-start-live').className).toMatch(/(^|\s)w-full(\s|$)/);
    expect(startRow).toContainElement(screen.getByTestId('rehearse'));
  });

  it('Given a 360px phone in a long language, Then the single column cannot grow past the card', () => {
    renderHero();
    expect(screen.getByTestId('home-hero-grid').className.split(/\s+/)).toContain('grid-cols-[minmax(0,1fr)]');
  });

  it('Then the desk has one even border, no thick colored edge on one side', () => {
    renderHero();
    expect(screen.getByTestId('home-hero').className).not.toMatch(/border-s-\[/);
  });

  it('Given a greeting on Home, Then it is the small page heading above the class name', () => {
    renderHero({ eyebrow: 'Good morning, Dana' });
    const greeting = screen.getByRole('heading', { level: 1 });
    expect(greeting).toHaveTextContent('Good morning, Dana');
    expect(before(greeting, screen.getByRole('heading', { level: 2 }))).toBe(true);
  });

  it('Given the class page, Then the class name is the page heading and the small line is plain text', () => {
    renderHero({ eyebrow: 'English', titleLevel: 1 });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Period 3');
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(screen.getByText('English').tagName).toBe('P');
  });

  it('Given a cue, Then the mascot says it on wide screens only', () => {
    renderHero({ cue: 'Autumn words are ready' });
    const cue = screen.getByTestId('home-coach-cue');
    expect(cue).toHaveTextContent('Autumn words are ready');
    expect(cue.closest('[data-testid="home-hero-art"]')?.className).toMatch(/(^|\s)hidden(\s|$)/);
  });

  it('Given a cue, Then narrow screens read it as the line under the class, hidden once the art column shows', () => {
    renderHero({ cue: 'Autumn words are ready' });
    const line = screen.getByTestId('home-coach-cue-line');
    expect(line).toHaveTextContent('Autumn words are ready');
    expect(line.className).toMatch(/@3xl\/hero:hidden/);
  });

  it('Given a class below its goal, Then the join row says who joined and is headed Get students in', () => {
    renderHero({ joinGoal: <span data-testid="goal">1 joined</span> });
    const row = screen.getByTestId('home-join-row');
    expect(within(row).getByTestId('goal')).toBeInTheDocument();
    expect(row).toHaveTextContent('academy.hq.getStudentsIn');
    expect(row).not.toHaveTextContent('academy.hq.classCode');
  });

  it('Given a class at its goal, Then the join row just names the class code', () => {
    renderHero();
    expect(screen.getByTestId('home-join-row')).toHaveTextContent('academy.hq.classCode');
  });
});
