/**
 * The recommended practice poster — the one thing on the picker a student is
 * meant to tap.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PracticePickerHero from './PracticePickerHero';
import type { PracticeTile } from '@/lib/education/practicePicker';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.values(params).join(',')})` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));

const tile = (over: Partial<PracticeTile> = {}): PracticeTile =>
  ({
    id: 'blitz',
    mode: 'blitz',
    titleKey: 'education.practice.blitz',
    skillKey: 'education.practicePicker.skill.blitz',
    ready: true,
    count: 8,
    countKind: 'words',
    sessions: 0,
    ...over,
  }) as PracticeTile;

describe('PracticePickerHero', () => {
  it('GIVEN a recommended tile WHEN rendered THEN it carries the accent as its own fill', () => {
    render(<PracticePickerHero tile={tile()} onSelect={vi.fn()} />);
    const hero = screen.getByTestId('practice-picker-hero');
    // blitz is the pink mode. A navy card on a navy page measures 1.2:1.
    expect(hero.className).toContain('bg-neo-pink');
    expect(hero.className).toContain('border-[3px]');
  });

  it('GIVEN an accent fill WHEN the mascot renders THEN the art is transparent, never a poster plate', () => {
    render(<PracticePickerHero tile={tile()} onSelect={vi.fn()} />);
    // A poster painted on neo-navy, dropped on a pink fill, reads as a bug.
    // Only `-nobg` art is eligible on an accent.
    expect(screen.getByTestId('practice-hero-art-blitz')).toHaveAttribute(
      'src',
      expect.stringMatching(/-nobg\.webp$/)
    );
  });

  it('GIVEN any mode WHEN rendered THEN there is exactly one primary action', () => {
    render(<PracticePickerHero tile={tile({ id: 'matching', mode: 'matching' })} onSelect={vi.fn()} />);
    expect(screen.getByTestId('practice-hero-art-matching')).toHaveAttribute(
      'src',
      expect.stringMatching(/-nobg\.webp$/)
    );
    expect(screen.getAllByTestId('practice-picker-hero-play')).toHaveLength(1);
  });

  it('GIVEN the hero WHEN tapped anywhere THEN the recommended practice starts', () => {
    const onSelect = vi.fn();
    render(<PracticePickerHero tile={tile()} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('practice-picker-hero-play'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'blitz' }));
  });
});
