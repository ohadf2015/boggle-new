import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const pref = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => pref.reduced }));
vi.unmock('framer-motion');

import { VocabQuizRevealBanner } from '../VocabQuizRevealBanner';

const t = (key: string) => key;
const props = { answer: 'fragile', word: 'brittle', definition: 'easily broken', sweep: false, t };

describe('VocabQuizRevealBanner — Lexi reacts in the verdict', () => {
  beforeEach(() => {
    pref.reduced = false;
  });

  it('Given a right answer and a face, Then the mascot wears it with a check badge', () => {
    render(<VocabQuizRevealBanner {...props} correct mascot="celebration" />);
    const slot = screen.getByTestId('vocab-quiz-verdict-mascot');
    expect(slot.querySelector('[data-variant="celebration"]')).not.toBeNull();
    expect(screen.getByTestId('vocab-quiz-verdict-badge').dataset.verdict).toBe('correct');
  });

  it('Given a wrong answer, Then the mascot winces with a cross badge', () => {
    render(<VocabQuizRevealBanner {...props} correct={false} mascot="oops" />);
    expect(screen.getByTestId('vocab-quiz-verdict-mascot').querySelector('[data-variant="oops"]')).not.toBeNull();
    expect(screen.getByTestId('vocab-quiz-verdict-badge').dataset.verdict).toBe('wrong');
  });

  it('Given no answer in time, Then the badge says missed, not wrong', () => {
    render(<VocabQuizRevealBanner {...props} correct={null} mascot="thinking" />);
    expect(screen.getByTestId('vocab-quiz-verdict-badge').dataset.verdict).toBe('missed');
  });

  it('Given the face changes, Then the mascot pops in by scale only, never opacity', () => {
    render(<VocabQuizRevealBanner {...props} correct mascot="onfire" />);
    const pop = screen.getByTestId('vocab-quiz-verdict-mascot');
    expect(pop.style.transform).toMatch(/scale/);
    expect(pop.style.opacity).toBe('');
  });

  it('Given reduced motion, Then the mascot sits at rest', () => {
    pref.reduced = true;
    render(<VocabQuizRevealBanner {...props} correct mascot="onfire" />);
    expect(screen.getByTestId('vocab-quiz-verdict-mascot').style.transform).not.toMatch(/scale\(0/);
  });

  it('Given a face, Then its slot is a block box so the size classes apply (an inline span ignores them and the art spills out of the band)', () => {
    render(<VocabQuizRevealBanner {...props} correct mascot="celebration" />);
    const classes = screen.getByTestId('vocab-quiz-verdict-mascot').className.split(/\s+/);
    expect(classes).toContain('block');
    expect(classes.some((c) => /^(sm:)?size-\d+$/.test(c))).toBe(true);
  });

  it('Given a definition, Then the verdict row and the definition sit in one bounded column that cannot outgrow the band', () => {
    render(<VocabQuizRevealBanner {...props} correct mascot="celebration" />);
    const row = screen.getByTestId('vocab-quiz-verdict-row');
    expect(row.className).toMatch(/\bmin-h-0\b/);
    expect(row.className).toMatch(/\boverflow-hidden\b/);
  });

  it('Given no face, Then the plain round icon still shows', () => {
    render(<VocabQuizRevealBanner {...props} correct />);
    expect(screen.queryByTestId('vocab-quiz-verdict-mascot')).toBeNull();
    expect(screen.getByTestId('vocab-quiz-verdict-badge').dataset.verdict).toBe('correct');
  });
});
