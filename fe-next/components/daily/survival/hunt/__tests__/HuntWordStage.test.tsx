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

  it('keeps the long-word sticker and letter count up while the check is pending', () => {
    stage({ phase: 'pending', word: 'PLANET' });
    expect(screen.getByText('wordHunt.survival.stage.longWord:{"bonus":5}')).toBeTruthy();
    expect(screen.getByTestId('hunt-stage-count').textContent).toBe('6');
  });

  it('pays the reward on its own strip below the word so it never covers a letter', () => {
    stage({ phase: 'verdict', verdict: 'good', word: 'PLANE', points: 14 });
    const reward = screen.getByTestId('hunt-stage-reward');
    const pill = screen.getByTestId('hunt-live-word').parentElement as HTMLElement;
    expect(pill.contains(reward)).toBe(false);
    expect(reward.contains(screen.getByTestId('hunt-stage-points'))).toBe(true);
  });

  it('keeps the released word up while the check is pending', () => {
    stage({ phase: 'pending', word: 'PLANE' });
    expect(screen.getByTestId('hunt-stage').dataset.phase).toBe('pending');
    expect(screen.getByTestId('hunt-live-word').textContent).toBe('PLANE');
  });

  it('given letters are being dragged, then screen readers are not spammed with every letter', () => {
    stage({ phase: 'live', word: 'CAT' });
    expect(screen.getByTestId('hunt-stage').getAttribute('aria-live')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('given a rejected word, then the word and its reason are announced', () => {
    stage({ phase: 'verdict', verdict: 'bad', word: 'SFRK', message: 'Not a word -4' });
    expect(screen.getByRole('status').textContent).toBe('SFRK: Not a word -4');
  });

  it('given an accepted word, then the word, cheer and life won are announced', () => {
    stage({ phase: 'verdict', verdict: 'good', word: 'PLANE', points: 14 });
    expect(screen.getByRole('status').textContent).toBe('PLANE: wordHunt.survival.stage.praiseMid +14');
  });

  it('given the word being built is as long as the hidden word, then a sticker on the pill says it costs a try', () => {
    stage({ phase: 'live', word: 'HOUSE', guess: true });
    expect(screen.getByTestId('hunt-stage-guess').textContent).toBe('wordHunt.survival.stage.usesTry');
    expect(screen.getByTestId('hunt-stage').dataset.guess).toBe('true');
  });

  it('given a free discovery or a verdict on show, then there is no try sticker', () => {
    stage({ phase: 'live', word: 'HOU', guess: false });
    expect(screen.queryByTestId('hunt-stage-guess')).toBeNull();
  });

  it('given the guess has been judged, then the try sticker makes way for the verdict', () => {
    stage({ phase: 'verdict', verdict: 'good', word: 'HOUSE', points: 5, guess: true });
    expect(screen.queryByTestId('hunt-stage-guess')).toBeNull();
  });
});
