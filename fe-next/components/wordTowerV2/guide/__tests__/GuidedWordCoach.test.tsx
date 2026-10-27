import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GuidedWordCoach } from '../GuidedWordCoach';
import type { Guide } from '../useGuidedFirstWord';

const playSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound }) }));

afterEach(cleanup);
const t = (k: string) => k;

function wheel() {
  return (
    <div>
      {[0, 1, 2, 3].map((i) => (
        <button key={i} type="button" data-wheel-index={i}>
          {'stop'[i]}
        </button>
      ))}
    </div>
  );
}

const guide = (over: Partial<Guide>): Guide => ({ status: 'spell', path: [3, 2, 1], word: 'POT', next: 3, ...over });

describe('GuidedWordCoach', () => {
  it('given the spell step, then a ring sits on every letter of the word and the next one is marked', () => {
    render(
      <>
        {wheel()}
        <GuidedWordCoach t={t} guide={guide({})} swinging={false} selected={[]} reducedMotion />
      </>,
    );
    expect(screen.getByTestId('wt2-guide').getAttribute('data-word')).toBe('POT');
    const slots = Array.from(document.querySelectorAll('[data-guide-slot]')).map((el) => el.getAttribute('data-guide-slot'));
    expect(slots).toEqual(['3', '2', '1']);
    expect(document.querySelector('[data-next]')?.getAttribute('data-guide-slot')).toBe('3');
    expect(screen.getByText('wordTowerV2.guide.spell')).toBeTruthy();
  });

  it('given the word hangs on the hook, then it says tap to drop', () => {
    render(<GuidedWordCoach t={t} guide={guide({ status: 'drop', next: null })} swinging selected={[]} reducedMotion />);
    expect(screen.getByText('wordTowerV2.guide.drop')).toBeTruthy();
    expect(document.querySelector('[data-guide-slot]')).toBeNull();
  });

  it('given the first floor landed, then it cheers once', () => {
    render(<GuidedWordCoach t={t} guide={guide({ status: 'done', next: null })} swinging={false} selected={[]} reducedMotion />);
    expect(screen.getByTestId('wt2-guide-done')).toBeTruthy();
    expect(playSound).toHaveBeenCalledWith('levelUp', expect.anything());
  });

  it('given a returning player (guide never ran), then nothing renders', () => {
    const { container } = render(<GuidedWordCoach t={t} guide={{ status: 'off', path: null, word: '', next: null }} swinging={false} selected={[]} reducedMotion />);
    expect(container.firstChild).toBeNull();
  });
});
