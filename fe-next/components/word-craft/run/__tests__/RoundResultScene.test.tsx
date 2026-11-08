import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { RoundResultScene } from '../RoundResultScene';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('RoundResultScene', () => {
  it('shows the passed headline when the round was cleared', () => {
    render(<RoundResultScene passed round={1} roundScore={130} target={100} onProceed={vi.fn()} />);
    expect(screen.getByText('wordcraft.run.roundResult.passed')).toBeInTheDocument();
  });

  it('shows the failed headline when the round was missed', () => {
    render(<RoundResultScene passed={false} round={2} roundScore={40} target={100} onProceed={vi.fn()} />);
    expect(screen.getByText('wordcraft.run.roundResult.failed')).toBeInTheDocument();
    expect(screen.getByText('wordcraft.run.roundResult.failedSub')).toBeInTheDocument();
  });

  it('shows near-miss framing instead of a flat fail when the score was close (85%+)', () => {
    render(<RoundResultScene passed={false} round={2} roundScore={88} target={100} onProceed={vi.fn()} />);
    expect(screen.getByText('wordcraft.run.roundResult.failed')).toBeInTheDocument();
    expect(screen.getByText('wordcraft.run.roundResult.closeSub')).toBeInTheDocument();
    expect(screen.queryByText('wordcraft.run.roundResult.failedSub')).not.toBeInTheDocument();
  });

  it('calls onProceed when the CTA is clicked', () => {
    const onProceed = vi.fn();
    render(<RoundResultScene passed round={1} roundScore={130} target={100} onProceed={onProceed} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onProceed).toHaveBeenCalled();
  });
});
