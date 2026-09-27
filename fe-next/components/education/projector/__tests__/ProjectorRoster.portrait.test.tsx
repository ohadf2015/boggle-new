/**
 * A projector on a portrait tablet (768x1024) put the whole roster in a thin
 * strip under the join panel, 13px chips, and ~600px of empty arena between
 * the last chip and Start. In portrait the roster now (1) sits centred in the
 * band it owns instead of top-pinned, and (2) steps the chip type up, since a
 * portrait screen is height-rich and width-poor.
 *
 * jsdom has no layout, so this pins the literal classes that do it; the
 * harness capture at 768x1024 is the proof it looks right.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('framer-motion', () => ({
  m: { div: 'div', span: 'span', p: 'p', li: 'li', ul: 'ul' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

import ProjectorRoster from '../ProjectorRoster';
import { ROSTER_DENSITY_TIERS } from '../projectorLobbyModel';

const t = (key: string) => key;
const classOf = (n: number) => Array.from({ length: n }, (_, i) => ({ username: `S${i + 1}` }));
const vw = (cls: string) => Number(/\[([\d.]+)vw\]/.exec(cls)?.[1]);

describe('rosterDensity — portrait step-up', () => {
  it('gives every tier a whole-literal portrait type size above its landscape md size', () => {
    for (const tier of ROSTER_DENSITY_TIERS) {
      expect(tier.portrait).toMatch(/^md:portrait:text-\[[\d.]+vw\]$/);
      const md = /md:text-\[([\d.]+)vw\]/.exec(tier.chip)![1];
      expect(vw(tier.portrait)).toBeGreaterThan(Number(md));
    }
  });

  it('still shrinks as the room fills', () => {
    const sizes = ROSTER_DENSITY_TIERS.map((tier) => vw(tier.portrait));
    for (let i = 1; i < sizes.length; i += 1) expect(sizes[i]).toBeLessThan(sizes[i - 1]);
  });
});

describe('ProjectorRoster in portrait', () => {
  it('puts the portrait size on each chip', () => {
    render(<ProjectorRoster students={classOf(12)} t={t} />);
    const chip = screen.getAllByTestId('projector-student')[0];
    expect(chip.className).toContain(ROSTER_DENSITY_TIERS[1].portrait);
  });

  it('centres the roster in its band instead of pinning it to the top', () => {
    render(<ProjectorRoster students={classOf(12)} t={t} />);
    const list = screen.getByTestId('projector-roster-list');
    expect(list.className).toContain('md:portrait:flex-none');
    const section = list.closest('section')!;
    expect(section.className).toContain('md:portrait:justify-center');
  });
});
