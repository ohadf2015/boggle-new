import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MpFinalFooter } from '../MpResultsFooter';

const t = (k: string) => k;

describe('classroom host results exit', () => {
  it('the final footer can label its exit "back to class"', () => {
    render(<MpFinalFooter isHost isReady={false} onRematch={vi.fn()} onLeave={vi.fn()} onShare={vi.fn()} leaveKey="mpUi.results.backToClass" t={t} />);
    expect(screen.getByTestId('mp-results-leave')).toHaveTextContent('mpUi.results.backToClass');
  });

  it('defaults to the arcade label', () => {
    render(<MpFinalFooter isHost isReady={false} onRematch={vi.fn()} onLeave={vi.fn()} onShare={vi.fn()} t={t} />);
    expect(screen.getByTestId('mp-results-leave')).toHaveTextContent('mpUi.results.leave');
  });

  it('both results surfaces take the exit copy from resultsExitCopy, not hardcoded arcade keys', () => {
    for (const f of ['../MpResultsStage.tsx', '../MpResultsScreen.tsx']) {
      const src = readFileSync(resolve(__dirname, f), 'utf8');
      expect(src, f).toMatch(/resultsExitCopy\(/);
      expect(src, f).not.toMatch(/description=\{t\('results\.exitWarning'\)\}/);
    }
  });
});
