import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HuntWordStage } from '../HuntWordStage';

const t = (key: string, params?: unknown) => {
  const p = (typeof params === 'object' && params) as Record<string, unknown> | false;
  return p ? `${key}:${JSON.stringify(p)}` : key;
};

function stage(props: Partial<React.ComponentProps<typeof HuntWordStage>>) {
  return render(
    <HuntWordStage phase="idle" word="" verdict={null} points={null} message="" calm={false} t={t} {...props} />,
  );
}

describe('HuntWordStage', () => {
  it('invites a swipe when idle and keeps the live word empty', () => {
    stage({});
    expect(screen.getByTestId('hunt-live-word').textContent).toBe('');
    expect(screen.getByText('wordHunt.survival.stage.prompt')).toBeTruthy();
  });

  it('spells the live word letter by letter while dragging', () => {
    stage({ phase: 'live', word: 'CAT' });
    const word = screen.getByTestId('hunt-live-word');
    expect(word.textContent).toBe('CAT');
    expect(word.querySelectorAll('[data-letter]')).toHaveLength(3);
    expect(screen.queryByText('wordHunt.survival.stage.prompt')).toBeNull();
  });

  it('previews the long-word bonus once the word is long enough', () => {
    stage({ phase: 'live', word: 'PLANET' });
    expect(screen.getByText('wordHunt.survival.stage.longWord:{"bonus":5}')).toBeTruthy();
  });

  it('pays out the points and a length-based cheer on a good word', () => {
    stage({ phase: 'verdict', verdict: 'good', word: 'PLANE', points: 14 });
    expect(screen.getByTestId('hunt-stage').dataset.verdict).toBe('good');
    expect(screen.getByTestId('hunt-stage-points').textContent).toContain('+14');
    expect(screen.getByText('wordHunt.survival.stage.praiseMid')).toBeTruthy();
  });

  it('names the reason on a rejected word', () => {
    stage({ phase: 'verdict', verdict: 'bad', word: 'SFRK', message: 'Not a word -4' });
    expect(screen.getByTestId('hunt-stage').dataset.verdict).toBe('bad');
    expect(screen.getByText('Not a word -4')).toBeTruthy();
    expect(screen.getByTestId('hunt-live-word').textContent).toBe('SFRK');
  });

  it('keeps the released word up while the check is pending', () => {
    stage({ phase: 'pending', word: 'PLANE' });
    expect(screen.getByTestId('hunt-stage').dataset.phase).toBe('pending');
    expect(screen.getByTestId('hunt-live-word').textContent).toBe('PLANE');
  });
});
