import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import BlastChainText from '../BlastChainText';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: { div: ({ children }: { children?: React.ReactNode }) => <div>{children}</div> },
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const t = (k: string) => k;

describe('BlastChainText', () => {
  it('stays silent with no chain', () => {
    const { container } = render(<BlastChainText chainLevel={0} t={t} />);
    expect(container.textContent).toBe('');
  });

  it('announces a real chain', () => {
    const { container } = render(<BlastChainText chainLevel={2} t={t} />);
    expect(container.textContent).toContain('blast.chain.double');
  });
});
