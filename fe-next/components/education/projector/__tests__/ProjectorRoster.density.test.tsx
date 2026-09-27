/**
 * A real class is 25–35 students, and NOBODY scrolls a projector.
 *
 * The first cut of the roster drew one fixed chip size and let the list
 * `overflow-y-auto`. On a wall that means arrival number ~18 pops in below the
 * fold: the animation fires, the count ticks up, and the student never sees
 * their own name land. That is the silent no-op shape (pitfall class 4) wearing
 * a spring animation.
 *
 * So the chip scales DOWN as the room fills. These tests pin the tiers on the
 * pure model (thresholds, whole literal Tailwind strings) and then pin that a
 * full class of 32 actually renders 32 chips at the dense tier.
 *
 * What is deliberately NOT asserted: "nothing overflows". jsdom has no layout —
 * every box is 0×0 — so any such assertion passes vacuously whatever the CSS
 * says. The tiers are the testable contract; the fit is arithmetic in the model
 * comment.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: {
    div: 'div', span: 'span', p: 'p', h1: 'h1', h2: 'h2', button: 'button', li: 'li', ul: 'ul',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

import ProjectorRoster from '../ProjectorRoster';
import { ROSTER_DENSITY_TIERS, rosterDensity } from '../projectorLobbyModel';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const classOf = (size: number) =>
  Array.from({ length: size }, (_, i) => ({ username: `Student${i + 1}` }));

describe('rosterDensity — the chip shrinks as the room fills', () => {
  it('gives a handful of students the biggest chip there is', () => {
    expect(rosterDensity(1)).toBe(ROSTER_DENSITY_TIERS[0]);
    expect(rosterDensity(8)).toBe(ROSTER_DENSITY_TIERS[0]);
  });

  it('steps down once a half-class is in', () => {
    expect(rosterDensity(9)).toBe(ROSTER_DENSITY_TIERS[1]);
    expect(rosterDensity(16)).toBe(ROSTER_DENSITY_TIERS[1]);
  });

  it('steps down again for a full class', () => {
    expect(rosterDensity(17)).toBe(ROSTER_DENSITY_TIERS[2]);
    expect(rosterDensity(26)).toBe(ROSTER_DENSITY_TIERS[2]);
  });

  it('reaches the densest tier for a big class and never goes past it', () => {
    expect(rosterDensity(27)).toBe(ROSTER_DENSITY_TIERS[3]);
    expect(rosterDensity(35)).toBe(ROSTER_DENSITY_TIERS[3]);
    expect(rosterDensity(120)).toBe(ROSTER_DENSITY_TIERS[3]);
  });

  it('is monotonic — a class never gets a BIGGER chip by adding a student', () => {
    const order = ROSTER_DENSITY_TIERS.map((tier) => tier.chip);
    let seen = 0;
    for (let count = 1; count <= 60; count += 1) {
      const index = order.indexOf(rosterDensity(count).chip);
      expect(index).toBeGreaterThanOrEqual(seen);
      seen = index;
    }
  });

  it('never composes a Tailwind class from a variable', () => {
    // Tailwind v4 only emits a utility it can see verbatim in the source, so an
    // interpolated `text-[${n}vw]` silently renders unstyled. Every tier string
    // must therefore be a whole literal — no `${`, no concatenation.
    for (const tier of ROSTER_DENSITY_TIERS) {
      expect(tier.chip).not.toContain('${');
      expect(tier.gap).not.toContain('${');
      expect(tier.chip).toMatch(/text-\[[\d.]+vw\]/);
      expect(tier.chip).toMatch(/md:text-\[[\d.]+vw\]/);
    }
  });
});

describe('ProjectorRoster — a whole class fits on the wall', () => {
  it('renders every student in a class of 32, not just the ones above the fold', () => {
    render(<ProjectorRoster students={classOf(32)} t={t} />);
    expect(screen.getAllByTestId('projector-student')).toHaveLength(32);
    expect(screen.getByTestId('projector-count')).toHaveTextContent('32');
  });

  it('drops to the densest chip for that class', () => {
    render(<ProjectorRoster students={classOf(32)} t={t} />);
    const chip = screen.getAllByTestId('projector-student')[0];
    for (const token of ROSTER_DENSITY_TIERS[3].chip.split(' ')) {
      expect(chip.className).toContain(token);
    }
  });

  it('keeps the roomy chip for the first few arrivals', () => {
    render(<ProjectorRoster students={classOf(3)} t={t} />);
    const chip = screen.getAllByTestId('projector-student')[0];
    for (const token of ROSTER_DENSITY_TIERS[0].chip.split(' ')) {
      expect(chip.className).toContain(token);
    }
  });

  it('tightens the gap between chips at the same time as the chip', () => {
    const { unmount } = render(<ProjectorRoster students={classOf(3)} t={t} />);
    expect(screen.getByTestId('projector-roster-list').className).toContain(
      ROSTER_DENSITY_TIERS[0].gap
    );
    unmount();

    render(<ProjectorRoster students={classOf(32)} t={t} />);
    expect(screen.getByTestId('projector-roster-list').className).toContain(
      ROSTER_DENSITY_TIERS[3].gap
    );
  });

  it('still marks the ready students once the chips are dense', () => {
    render(
      <ProjectorRoster
        students={classOf(30)}
        readyUsernames={['Student4', 'Student29']}
        t={t}
      />
    );
    const ready = screen
      .getAllByTestId('projector-student')
      .filter((el) => el.getAttribute('data-ready') === 'true');
    expect(ready).toHaveLength(2);
  });
});
