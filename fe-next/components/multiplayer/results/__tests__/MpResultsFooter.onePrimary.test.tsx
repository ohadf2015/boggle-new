import React from 'react';
import { render, screen } from '@testing-library/react';
import { MpFinalFooter } from '../MpResultsFooter';

const t = (k: string) => k;

describe('MpFinalFooter: one primary, the rest quiet', () => {
  it('Given the final footer, Then REMATCH is the only filled call to action', () => {
    render(<MpFinalFooter isHost isReady={false} onRematch={vi.fn()} onLeave={vi.fn()} onShare={vi.fn()} t={t} />);
    expect(screen.getAllByTestId('mp-primary-cta')).toHaveLength(1);
    for (const id of ['mp-results-share', 'mp-results-leave']) {
      expect(screen.getByTestId(id).className).not.toMatch(/bg-neo-(pink|lime|cyan|yellow)\b/);
    }
  });
});
