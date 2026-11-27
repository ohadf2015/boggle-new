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

const BLOCK_FILL = /(^|\s)bg-neo-(pink|purple|yellow)(\s|$)/;

describe('<HomeHero> layout', () => {
  it('Then it reads top to bottom: the class, its code chip, one Start, then the small secondaries', () => {
    renderHero();
    const title = screen.getByRole('heading', { level: 2 });
    const code = screen.getByTestId('home-join-row');
    const start = screen.getByTestId('home-start-live');
    const second = screen.getByTestId('rehearse');
    expect(before(title, code)).toBe(true);
    expect(before(code, start)).toBe(true);
    expect(before(start, second)).toBe(true);
  });

  it('Given Home, Then the desk is one white outlined card and the class name sits on a pink band', () => {
    renderHero();
    expect(screen.getByTestId('home-hero').className).toContain('edu-card');
    expect(screen.getByTestId('home-hero').className).not.toMatch(BLOCK_FILL);
    const band = screen.getByRole('heading', { level: 2 });
    expect(band.className).toMatch(/(^|\s)bg-neo-pink(\s|$)/);
    expect(band.className).toContain('text-neo-black');
    expect(band.className).toContain('border-[3px]');
  });

  it('Given the class page, Then the desk stays open on the page with a plain heading', () => {
    renderHero({ tone: 'purple', titleLevel: 1 });
    expect(screen.getByTestId('home-hero').className).not.toMatch(BLOCK_FILL);
    expect(screen.getByTestId('home-hero').className).not.toContain('edu-card');
    expect(screen.getByRole('heading', { level: 1 }).className).not.toMatch(BLOCK_FILL);
  });

  it('Then the class code reads as letter tiles inside the one share button', () => {
    renderHero();
    const share = screen.getByTestId('home-share-code');
    const tiles = within(share).getAllByTestId('home-desk-code-tile');
    expect(tiles.map((el) => el.textContent)).toEqual(['A', 'B', '1', '2', 'C', 'D']);
    for (const tile of tiles) expect(tile.className).toContain('edu-tile');
    expect(within(screen.getByTestId('home-join-row')).getByTestId('home-desk-code')).toHaveTextContent('AB12CD');
    expect(share).toHaveAccessibleName('eduShell.home.shareCode: AB12CD');
  });

  it('Given Home, Then the code button is a squared tile card, never a pill around the letter tiles', () => {
    renderHero();
    const share = screen.getByTestId('home-share-code');
    expect(share.className).toContain('rounded-neo-lg');
    expect(share.className).not.toContain('rounded-neo-pill');
  });

  it('Then Start is the one marked hero action and the secondaries share one row beside each other', () => {
    renderHero({ replay: { kind: 'ready', href: '/again', detail: 'Word Hunt' } });
    expect(document.querySelectorAll('[data-hero="true"]')).toHaveLength(1);
    const chips = screen.getByTestId('home-hero-chips');
    expect(chips).toContainElement(screen.getByTestId('rehearse'));
    expect(chips).toContainElement(screen.getByTestId('home-pick-game'));
    expect(chips.className).toMatch(/(^|\s)flex-wrap(\s|$)/);
    expect(chips.className).toContain('[&>*]:grow');
  });

  it('Given a greeting on Home, Then it is one plain line above the desk, and the mascot sits in the desk once, hidden from readers', () => {
    renderHero({ eyebrow: 'Good morning, Dana' });
    const row = screen.getByTestId('home-greeting-row');
    expect(within(row).getByRole('heading', { level: 1 })).toHaveTextContent('Good morning, Dana');
    expect(row.querySelector('[class*="bg-neo-cream"]')).toBeNull();
    expect(screen.queryByTestId('home-coach-cue')).toBeNull();
    expect(before(row, screen.getByRole('heading', { level: 2 }))).toBe(true);
    expect(within(row).queryByTestId('home-greeting-mascot')).toBeNull();
    const mascot = screen.getByTestId('home-desk-mascot');
    expect(screen.getByTestId('home-hero')).toContainElement(mascot);
    expect(mascot).toHaveAttribute('aria-hidden', 'true');
    expect(mascot.className).toContain('max-lg:hidden');
  });

  it('Given the class page, Then the class name is the page heading and the small line is plain text, with no greeting', () => {
    renderHero({ eyebrow: 'English', titleLevel: 1 });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Period 3');
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(screen.getByText('English').tagName).toBe('P');
    expect(screen.queryByTestId('home-greeting-row')).toBeNull();
  });

  it('Given a class below its goal, Then who joined shows as a quiet line under the code chip', () => {
    renderHero({ joinGoal: <span data-testid="goal">1 joined</span> });
    expect(before(screen.getByTestId('home-join-row'), screen.getByTestId('goal'))).toBe(true);
  });
});
