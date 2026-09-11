/**
 * The student header must not hand its score to the floating mute button.
 *
 * Measured live at 390x844 on 2026-09-11: once the quiz claims the screen the
 * app chrome collapses and the app's own MUTE control stays behind as a fixed
 * 40px button at (342,8)-(382,48). The score counter sat at (338,20)-(378,48) —
 * a near-total overlap, so the running total and the "+130" that flies into it
 * were both painted underneath a button. The whole point of turning the points
 * breakdown into a counter is that a student can read it in half a second.
 *
 * The header therefore reserves that corner. Asserted as a class because jsdom
 * lays nothing out: the real geometry is re-checked in the page.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VocabQuizStudentHeader } from '../VocabQuizStudentHeader';

vi.mock('@/components/ui/InteractiveMascot', () => ({
  // A span, not an <img>: next/lint rejects a bare <img> even in a mock, and
  // the header only cares that the mascot occupies the start of the row.
  InteractiveMascot: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt} />,
}));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

function setup(overrides: Partial<Parameters<typeof VocabQuizStudentHeader>[0]> = {}) {
  const { container } = render(
    <VocabQuizStudentHeader
      questionNumber={1}
      totalQuestions={5}
      streak={0}
      score={0}
      pop={null}
      mascot="thinking"
      lockedIn={null}
      rank={null}
      t={t}
      {...overrides}
    />
  );
  return container.querySelector('header') as HTMLElement;
}

describe('VocabQuizStudentHeader', () => {
  it('keeps the end corner clear for the app mute button', () => {
    // Logical property, not `pr-*`: in Hebrew the header mirrors and so does
    // the floating control, so the reserved corner has to mirror with them.
    expect(setup().className).toContain('pe-11');
  });

  it('grows the flame with the streak and caps it before it eats the header', () => {
    const three = setup({ streak: 3 }).querySelector('svg') as SVGElement;
    const twenty = setup({ streak: 20 }).querySelector('svg') as SVGElement;
    const px = (el: SVGElement) => Number(String((el as unknown as HTMLElement).style.width).replace('px', ''));
    expect(px(three)).toBeGreaterThan(20);
    expect(px(twenty)).toBeGreaterThan(px(three));
    expect(px(twenty)).toBeLessThanOrEqual(32);
  });

  it('shows no flame at all below a streak of two', () => {
    expect(setup({ streak: 1 }).querySelector('svg')).toBeNull();
  });
});
