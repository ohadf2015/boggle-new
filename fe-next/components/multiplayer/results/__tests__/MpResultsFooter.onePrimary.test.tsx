import React from 'react';
import { render, screen } from '@testing-library/react';
import { MpFinalFooter } from '../MpResultsFooter';

const t = (k: string) => k;

describe('MpFinalFooter: one primary, at most one quiet secondary', () => {
  it('Given the final footer, Then REMATCH is the only filled call to action and Share the one quiet extra (leave lives in the header)', () => {
    render(<MpFinalFooter isHost isReady={false} onRematch={vi.fn()} onLeave={vi.fn()} onShare={vi.fn()} t={t} />);
    expect(screen.getAllByTestId('mp-primary-cta')).toHaveLength(1);
    expect(screen.getByTestId('mp-results-share').className).not.toMatch(/bg-neo-(pink|lime|cyan|yellow)\b/);
    expect(screen.queryByTestId('mp-results-leave')).toBeNull();
    expect(screen.queryByTestId('mp-results-challenge')).toBeNull();
  });

  it('Given a classroom host, Then the quiet extra is the way back to class', () => {
    render(<MpFinalFooter isHost isReady={false} onRematch={vi.fn()} onLeave={vi.fn()} onShare={vi.fn()} leaveKey="mpUi.results.backToClass" t={t} />);
    expect(screen.getByTestId('mp-results-leave')).toHaveTextContent('mpUi.results.backToClass');
    expect(screen.queryByTestId('mp-results-share')).toBeNull();
  });
});
