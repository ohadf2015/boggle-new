/**
 * ReportDialog tests — reason selection + optional context, submit emits the chosen reason.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportDialog } from '../ReportDialog';

const t = (k: string) => k;

describe('ReportDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GIVEN open WHEN rendered THEN shows all four report reasons', () => {
    render(<ReportDialog open onClose={vi.fn()} onSubmit={vi.fn()} t={t} />);
    expect(screen.getByText('report.reasons.harassment')).toBeInTheDocument();
    expect(screen.getByText('report.reasons.spam')).toBeInTheDocument();
    expect(screen.getByText('report.reasons.inappropriate')).toBeInTheDocument();
    expect(screen.getByText('report.reasons.other')).toBeInTheDocument();
  });

  it('GIVEN no reason chosen WHEN rendered THEN submit is disabled', () => {
    render(<ReportDialog open onClose={vi.fn()} onSubmit={vi.fn()} t={t} />);
    expect(screen.getByRole('button', { name: 'report.submit' })).toBeDisabled();
  });

  it('GIVEN a reason chosen WHEN submit THEN calls onSubmit with that reason', () => {
    const onSubmit = vi.fn();
    render(<ReportDialog open onClose={vi.fn()} onSubmit={onSubmit} t={t} />);

    fireEvent.click(screen.getByText('report.reasons.harassment'));
    fireEvent.click(screen.getByRole('button', { name: 'report.submit' }));

    expect(onSubmit).toHaveBeenCalledWith('harassment', undefined);
  });

  it('GIVEN a reason + context WHEN submit THEN passes the trimmed context', () => {
    const onSubmit = vi.fn();
    render(<ReportDialog open onClose={vi.fn()} onSubmit={onSubmit} t={t} />);

    fireEvent.click(screen.getByText('report.reasons.spam'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  buying gold spam  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'report.submit' }));

    expect(onSubmit).toHaveBeenCalledWith('spam', 'buying gold spam');
  });
});
