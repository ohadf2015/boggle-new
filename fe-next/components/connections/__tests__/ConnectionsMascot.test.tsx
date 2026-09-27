import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ConnectionsMascot, { moodForStatus, MOOD_SRC } from '../ConnectionsMascot';

describe('moodForStatus', () => {
  it('maps every game status to a mood with an asset', () => {
    expect(moodForStatus('playing')).toBe('idle');
    expect(moodForStatus('wrong')).toBe('wrong');
    expect(moodForStatus('correct')).toBe('happy');
    expect(moodForStatus('gaveUp')).toBe('encourage');
    expect(moodForStatus('outOfLives')).toBe('panic');
    expect(moodForStatus('won')).toBe('won');
    expect(moodForStatus('lost')).toBe('lost');
  });

  it('falls back to idle for unknown statuses', () => {
    expect(moodForStatus('???')).toBe('idle');
  });

  it('has an image source for every mood', () => {
    (['idle', 'wrong', 'happy', 'encourage', 'panic', 'won', 'lost'] as const).forEach((mood) => {
      expect(MOOD_SRC[mood]).toMatch(/^\/mascot\/.+\.webp$/);
    });
  });
});

describe('ConnectionsMascot', () => {
  it('renders the mood image, decorative (hidden from a11y tree)', () => {
    const { container } = render(<ConnectionsMascot status="correct" />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe(MOOD_SRC.happy);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('swaps image when status changes', () => {
    const { container, rerender } = render(<ConnectionsMascot status="playing" />);
    const first = container.querySelector('img')?.getAttribute('src');
    rerender(<ConnectionsMascot status="wrong" />);
    const second = container.querySelector('img')?.getAttribute('src');
    expect(first).not.toBe(second);
  });
});
