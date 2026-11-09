import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MpFinalFooter } from '../MpResultsFooter';

const t = (k: string) => k;

describe('MpFinalFooter Challenge CTA', () => {
  it('keeps Rematch primary and fires Challenge only on click', () => {
    const onRematch = vi.fn();
    const onChallenge = vi.fn();
    render(
      <MpFinalFooter
        isHost
        isReady={false}
        onRematch={onRematch}
        onLeave={vi.fn()}
        onShare={vi.fn()}
        onChallenge={onChallenge}
        t={t}
      />,
    );
    expect(screen.getByTestId('mp-results-challenge')).toBeTruthy();
    fireEvent.click(screen.getByTestId('mp-results-challenge'));
    expect(onChallenge).toHaveBeenCalledOnce();
    expect(onRematch).not.toHaveBeenCalled();
  });

  it('omits Challenge when handler absent (classroom)', () => {
    render(
      <MpFinalFooter
        isHost
        isReady={false}
        onRematch={vi.fn()}
        onLeave={vi.fn()}
        onShare={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByTestId('mp-results-challenge')).toBeNull();
  });
});
