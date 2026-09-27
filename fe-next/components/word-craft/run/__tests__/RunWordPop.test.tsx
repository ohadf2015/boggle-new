import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RunWordPop from '../RunWordPop';

const t = (k: string) => k;

describe('RunWordPop — per-word commit feedback', () => {
  it('renders nothing when there is no pop', () => {
    const { container } = render(<RunWordPop pop={null} t={t} />);
    expect(container.querySelector('[data-testid="run-word-pop"]')).toBeNull();
  });

  it('shows the points and the tier label on a commit', () => {
    render(<RunWordPop pop={{ total: 42, tier: 'huge', key: 1 }} t={t} />);
    expect(screen.getByTestId('run-word-pop')).toHaveTextContent('+42');
    expect(screen.getByText('wordcraft.run.feedback.huge')).toBeInTheDocument();
  });

  it('tags the tier so the juice can scale with it', () => {
    render(<RunWordPop pop={{ total: 8, tier: 'nice', key: 2 }} t={t} />);
    expect(screen.getByTestId('run-word-pop')).toHaveAttribute('data-tier', 'nice');
  });
});
