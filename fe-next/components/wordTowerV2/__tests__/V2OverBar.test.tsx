/**
 * The bar pinned over the fallen tower after the results card is closed. On the
 * daily it must still hand off to the next daily quest — closing the card used
 * to drop the NextQuestCta and leave only replay/home.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const nextQuest = vi.fn();
vi.mock('@/components/daily/results/NextQuestCta', () => ({
  NextQuestCta: (props: Record<string, unknown>) => {
    nextQuest(props);
    return <div data-testid="next-quest-cta" />;
  },
}));

import { V2OverBar } from '../V2OverBar';

const t = (k: string) => k;
const handlers = () => ({ onBadges: vi.fn(), onRestart: vi.fn(), onHome: vi.fn() });

describe('V2OverBar', () => {
  it('given a daily run, then a compact next-quest hand-off sits with replay/home', () => {
    render(<V2OverBar t={t} daily language="he" {...handlers()} />);
    expect(screen.getByTestId('next-quest-cta')).toBeTruthy();
    expect(nextQuest).toHaveBeenCalledWith(
      expect.objectContaining({ justFinished: 'word-tower', currentLanguage: 'he', source: 'word_tower_over_bar' }),
    );
    expect(screen.getByText('common.playAgain')).toBeTruthy();
  });

  it('given a free-play run, then there is no daily hand-off', () => {
    render(<V2OverBar t={t} daily={false} language="en" {...handlers()} />);
    expect(screen.queryByTestId('next-quest-cta')).toBeNull();
  });

  it('wires badges, replay and home', () => {
    const h = handlers();
    render(<V2OverBar t={t} daily={false} language="en" {...h} />);
    fireEvent.click(screen.getByText('wordTowerV2.results.badges'));
    fireEvent.click(screen.getByText('common.playAgain'));
    fireEvent.click(screen.getByLabelText('wordTowerV2.results.home'));
    expect(h.onBadges).toHaveBeenCalled();
    expect(h.onRestart).toHaveBeenCalled();
    expect(h.onHome).toHaveBeenCalled();
  });

  it('is the bar WordTowerV2 pins after closing results, with the daily flag passed through', () => {
    const src = readFileSync(resolve(__dirname, '../WordTowerV2.tsx'), 'utf8');
    expect(src).toMatch(/<V2OverBar[\s\S]*?daily=\{daily\}/);
  });
});
