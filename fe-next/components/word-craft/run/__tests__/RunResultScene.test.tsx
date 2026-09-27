import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { RunResultScene } from '../RunResultScene';
import { POWER_CARD_POOL } from '@/lib/word-craft/run/powerCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('RunResultScene', () => {
  it('shows the cleared headline and run total when the run was cleared', () => {
    render(
      <RunResultScene cleared runTotal={420} activeCards={POWER_CARD_POOL.slice(0, 2)} onRestart={vi.fn()} />,
    );
    expect(screen.getByText('wordcraft.run.runResult.cleared')).toBeInTheDocument();
    expect(screen.getByText('420')).toBeInTheDocument();
  });

  it('shows the failed headline when the run ended early', () => {
    render(<RunResultScene cleared={false} runTotal={120} activeCards={[]} onRestart={vi.fn()} />);
    expect(screen.getByText('wordcraft.run.runResult.failed')).toBeInTheDocument();
  });

  it('calls onRestart when the restart CTA is clicked', () => {
    const onRestart = vi.fn();
    render(<RunResultScene cleared runTotal={420} activeCards={[]} onRestart={onRestart} />);
    fireEvent.click(screen.getByRole('button', { name: 'wordcraft.run.restart' }));
    expect(onRestart).toHaveBeenCalled();
  });
});
