import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/Avatar', () => ({ default: () => null }));

import WordWheelRankLadder from '../WordWheelRankLadder';
import { rankThresholds } from '@/lib/wordWheel/rankLadder';

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;
const th = rankThresholds(120);

describe('WordWheelRankLadder', () => {
  it('always shows the current rank and score, even with no rivals', () => {
    render(<WordWheelRankLadder t={t} score={0} thresholds={th} rivals={[]} />);
    expect(screen.getByTestId('rank-name').textContent).toBe('wordWheel.rank.warmUp');
    expect(screen.getByTestId('rank-bubble').textContent).toBe('0');
  });

  it('moves to the next rank once the score crosses its threshold', () => {
    const { rerender } = render(<WordWheelRankLadder t={t} score={0} thresholds={th} rivals={[]} />);
    rerender(<WordWheelRankLadder t={t} score={12} thresholds={th} rivals={[]} />);
    expect(screen.getByTestId('rank-name').textContent).toBe('wordWheel.rank.spinning');
    expect(screen.getByTestId('rank-ladder').getAttribute('data-rank-index')).toBe('1');
  });

  it('marks passed rank dots and reports progress as a value on the track', () => {
    render(<WordWheelRankLadder t={t} score={90} thresholds={th} rivals={[]} />);
    expect(document.querySelectorAll('[data-rank-dot="passed"]')).toHaveLength(4);
    const track = screen.getByRole('progressbar');
    expect(Number(track.getAttribute('aria-valuenow'))).toBe(90);
  });

  it('names the next rival to pass in a reserved slot when rivals are on', () => {
    render(
      <WordWheelRankLadder t={t} score={10} thresholds={th} showRival rivals={[{ name: 'Ava', score: 20 }]} />,
    );
    expect(screen.getByTestId('next-rival-slot').textContent).toMatch(/pointsToPass.*"count":10.*"name":"Ava"/);
  });

  it('opens the full rank list behind one tap', () => {
    render(<WordWheelRankLadder t={t} score={50} thresholds={th} rivals={[]} />);
    expect(screen.queryByTestId('rank-list')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /wordWheel\.rank\.open/ }));
    const list = screen.getByTestId('rank-list');
    expect(list.querySelectorAll('li')).toHaveLength(th.length);
    expect(list.querySelector('[aria-current="true"]')?.textContent).toMatch(/onARoll/);
  });

  it('list variant shows the rank list without a tap', () => {
    render(<WordWheelRankLadder t={t} score={50} thresholds={th} rivals={[]} variant="list" />);
    expect(screen.getByTestId('rank-list')).toBeInTheDocument();
  });

  it('wide variant keeps the score bubble on a progress track', () => {
    render(<WordWheelRankLadder t={t} score={42} thresholds={th} rivals={[]} variant="wide" />);
    expect(screen.getByTestId('rank-bubble').textContent).toBe('42');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('42');
  });
});
