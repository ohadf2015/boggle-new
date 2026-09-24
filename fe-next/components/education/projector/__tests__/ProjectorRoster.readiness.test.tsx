/**
 * Readiness lives WITH the faces (round 3 critic: "3/10 ready" floated as a
 * pill away from the tiles it counted).
 *
 * - The header carries "N / M ready" as a real progress bar.
 * - A ready tile glows and wears a corner check badge (absolute, so a dense
 *   32-student wall keeps its chip widths).
 * - Once anyone is ready, the tiles still waiting step back (dimmer), so the
 *   teacher reads who is holding the room up at a glance. Before anyone is
 *   ready nobody is dimmed — an arrival is still a reward.
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

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const classOf = (size: number) =>
  Array.from({ length: size }, (_, i) => ({ username: `Student${i + 1}` }));

describe('ProjectorRoster readiness', () => {
  it('Given 3 of 10 ready, Then the header shows a progress bar at 3 of 10', () => {
    render(<ProjectorRoster students={classOf(10)} readyUsernames={['Student1', 'Student2', 'Student3']} t={t} />);
    const bar = screen.getByTestId('projector-ready-count');
    expect(bar).toHaveAttribute('role', 'progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getByTestId('projector-ready-fill').style.width).toBe('30%');
  });

  it('Given nobody ready yet, Then the bar still shows 0 of N (the goal is visible)', () => {
    render(<ProjectorRoster students={classOf(4)} t={t} />);
    expect(screen.getByTestId('projector-ready-count')).toHaveAttribute('aria-valuenow', '0');
  });

  it('Given an empty room, Then there is no ready bar', () => {
    render(<ProjectorRoster students={[]} t={t} />);
    expect(screen.queryByTestId('projector-ready-count')).not.toBeInTheDocument();
  });

  it('marks a ready tile with a corner check badge and a glow', () => {
    render(<ProjectorRoster students={classOf(3)} readyUsernames={['Student2']} t={t} />);
    const chips = screen.getAllByTestId('projector-student');
    expect(chips[1].querySelector('[data-testid="projector-ready-check"]')).not.toBeNull();
    expect(chips[0].querySelector('[data-testid="projector-ready-check"]')).toBeNull();
    expect(chips[1].getAttribute('data-glow')).toBe('true');
  });

  it('dims the tiles still waiting once someone is ready — never before', () => {
    const { unmount } = render(<ProjectorRoster students={classOf(3)} readyUsernames={['Student2']} t={t} />);
    const chips = screen.getAllByTestId('projector-student');
    expect(chips.map((c) => c.getAttribute('data-dim'))).toEqual(['true', 'false', 'true']);
    unmount();

    render(<ProjectorRoster students={classOf(3)} t={t} />);
    expect(screen.getAllByTestId('projector-student').map((c) => c.getAttribute('data-dim'))).toEqual([
      'false',
      'false',
      'false',
    ]);
  });
});
