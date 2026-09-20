import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRun } from '@/lib/wordTowerV2/run';
import { V2Results } from '../V2Results';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const results = (over: Partial<Parameters<typeof V2Results>[0]> = {}) => (
  <V2Results
    t={t}
    peakM={12}
    score={900}
    bestM={12}
    isBest
    run={createRun(1)}
    badges={[]}
    unlocked={new Set<string>()}
    onRestart={() => {}}
    onHome={() => {}}
    onClose={() => {}}
    {...over}
  />
);

describe('V2Results — getting out of the modal', () => {
  it('given the run is over, when rendered, then there is a way home', () => {
    const onHome = vi.fn();
    render(results({ onHome }));

    fireEvent.click(screen.getByLabelText('wordTowerV2.results.home'));
    expect(onHome).toHaveBeenCalledOnce();
  });

  it('given the run is over, when the close control is tapped, then the modal dismisses', () => {
    const onClose = vi.fn();
    render(results({ onClose }));

    fireEvent.click(screen.getByLabelText('wordTowerV2.results.close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('given the run is over, when Escape is pressed, then the modal dismisses', () => {
    const onClose = vi.fn();
    render(results({ onClose }));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('given the backdrop is tapped, then the modal dismisses', () => {
    const onClose = vi.fn();
    const { container } = render(results({ onClose }));

    fireEvent.click(container.querySelector('[data-wt2-results-backdrop]')!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('given no smash target and too few words to share, then neither dead CTA is rendered', () => {
    render(results());

    expect(screen.queryByText('wordTowerV2.wreck.share')).toBeNull();
    expect(screen.queryByText(/smash/i)).toBeNull();
    // The one action that always works is still there.
    expect(screen.getByText('common.playAgain')).toBeTruthy();
  });
});
