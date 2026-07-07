/**
 * ScoreBreakdownTooltip — click-to-toggle scoring-rules popup.
 *
 * Despite the name this is a click-triggered, persistent, interactive
 * popup (backdrop-click-to-close, its own close button) — Popover
 * semantics, not hover-triggered Tooltip semantics. Locks current
 * behavior before reimplementing on shadcn Popover instead of the
 * hand-rolled toggle+backdrop+positioning logic.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import ScoreBreakdownTooltip from '../ScoreBreakdownTooltip';

const t = (key: string) => key;

describe('ScoreBreakdownTooltip', () => {
  it('is closed by default', () => {
    render(<ScoreBreakdownTooltip t={t} />);
    expect(screen.queryByText('scoring.pointsPerWord')).not.toBeInTheDocument();
  });

  it('opens the scoring breakdown on click', () => {
    render(<ScoreBreakdownTooltip t={t} />);
    fireEvent.click(screen.getByLabelText('scoring.howItWorks'));
    expect(screen.getByText('scoring.pointsPerWord')).toBeInTheDocument();
  });

  it('filters out rules below minWordLength', () => {
    render(<ScoreBreakdownTooltip t={t} minWordLength={5} />);
    fireEvent.click(screen.getByLabelText('scoring.howItWorks'));
    expect(screen.queryByText('3 scoring.letters')).not.toBeInTheDocument();
    expect(screen.getByText('5 scoring.letters')).toBeInTheDocument();
  });

  it('closes when the close button is clicked', () => {
    render(<ScoreBreakdownTooltip t={t} />);
    fireEvent.click(screen.getByLabelText('scoring.howItWorks'));
    fireEvent.click(screen.getByLabelText('common.close'));
    expect(screen.queryByText('scoring.pointsPerWord')).not.toBeInTheDocument();
  });
});
