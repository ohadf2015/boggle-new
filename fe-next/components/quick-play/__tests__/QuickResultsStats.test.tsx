import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QuickResultsStats, STAT_TIMELINE, STAT_COUNT_MS } from '../QuickResultsStats';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const cards = ['quick-stat-score', 'quick-stat-perfect', 'quick-stat-words'];

describe('QuickResultsStats', () => {
  it('lands score, then % of perfect, then words, one after another', () => {
    render(<QuickResultsStats score={900} scorePct={90} wordsFound={9} animate />);
    const delays = cards.map((id) => Number(screen.getByTestId(id).getAttribute('data-delay')));
    expect(delays[0]).toBeLessThan(delays[1]);
    expect(delays[1]).toBeLessThan(delays[2]);
  });

  it('starts every card from zero so the count-up is visible', () => {
    render(<QuickResultsStats score={900} scorePct={90} wordsFound={9} animate />);
    expect(screen.getByTestId('quick-stat-score')).toHaveTextContent(/^quickPlay\.solo\.statScore0$/);
  });

  it('shows the real values straight away when motion is off', () => {
    render(<QuickResultsStats score={900} scorePct={90} wordsFound={9} animate={false} />);
    expect(screen.getByTestId('quick-stat-score')).toHaveTextContent('900');
    expect(screen.getByTestId('quick-hero-percentage')).toHaveTextContent('90%');
    expect(screen.getByTestId('quick-stat-words')).toHaveTextContent('9');
    expect(screen.getByTestId('quick-stat-perfect')).toHaveTextContent('quickPlay.solo.ofPerfect');
  });

  it('carries each final value for assistive tech and tests', () => {
    render(<QuickResultsStats score={0} scorePct={0} wordsFound={0} animate />);
    expect(cards.map((id) => screen.getByTestId(id).getAttribute('data-value'))).toEqual(['0', '0', '0']);
  });

  it('pops each number the moment its count-up lands', () => {
    render(<QuickResultsStats score={900} scorePct={90} wordsFound={9} animate />);
    const value = screen.getByTestId('quick-hero-percentage');
    expect(value.className).toContain('qp-value-pop');
    expect(value.style.animationDelay).toBe(`${STAT_TIMELINE.perfect.count + STAT_COUNT_MS}ms`);
  });

  it('never pops the numbers when motion is off', () => {
    render(<QuickResultsStats score={900} scorePct={90} wordsFound={9} animate={false} />);
    expect(screen.getByTestId('quick-hero-percentage').className).not.toContain('qp-value-pop');
  });

  it('makes a landing card solid early, so a mid-entrance frame never shows a ghost card', () => {
    const css = readFileSync(join(process.cwd(), 'app/animations.css'), 'utf8');
    const block = css.slice(css.indexOf('@keyframes qp-card-in'));
    const solidAt = block.match(/(\d+)%\s*\{[^}]*opacity:\s*1/);
    expect(solidAt).not.toBeNull();
    expect(Number(solidAt![1])).toBeLessThanOrEqual(20);
  });
});
