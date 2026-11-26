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

describe('<HomeHero> layout: an open desk on the backdrop, not a colored slab', () => {
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

  it('Then neither the desk nor the code sits on a color block', () => {
    renderHero();
    expect(screen.getByTestId('home-hero').className).not.toMatch(BLOCK_FILL);
    expect(screen.getByTestId('home-join-row').className).not.toMatch(BLOCK_FILL);
  });

  it('Given the purple tone (class page), Then it is not a purple slab either', () => {
    renderHero({ tone: 'purple', titleLevel: 1 });
    expect(screen.getByTestId('home-hero').className).not.toMatch(BLOCK_FILL);
  });

  it('Then the class code is one compact chip, not a row of letter tiles', () => {
    renderHero();
    expect(screen.queryAllByTestId('home-desk-code-tile')).toHaveLength(0);
    expect(within(screen.getByTestId('home-join-row')).getByTestId('home-desk-code')).toHaveTextContent('AB12CD');
  });

  it('Then Start is the one marked hero action and the secondaries share one row beside each other', () => {
    renderHero({ replay: { kind: 'ready', href: '/again', detail: 'Word Hunt' } });
    expect(document.querySelectorAll('[data-hero="true"]')).toHaveLength(1);
    const chips = screen.getByTestId('home-hero-chips');
    expect(chips).toContainElement(screen.getByTestId('rehearse'));
    expect(chips).toContainElement(screen.getByTestId('home-pick-game'));
    expect(chips.className).toMatch(/(^|\s)flex-wrap(\s|$)/);
  });

  it('Given a greeting on Home, Then it is one plain line with a small mascot, no speech bubble and no second line', () => {
    renderHero({ eyebrow: 'Good morning, Dana' });
    const row = screen.getByTestId('home-greeting-row');
    expect(within(row).getByRole('heading', { level: 1 })).toHaveTextContent('Good morning, Dana');
    expect(row.querySelector('[class*="bg-neo-cream"]')).toBeNull();
    expect(screen.queryByTestId('home-coach-cue')).toBeNull();
    expect(before(row, screen.getByRole('heading', { level: 2 }))).toBe(true);
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
