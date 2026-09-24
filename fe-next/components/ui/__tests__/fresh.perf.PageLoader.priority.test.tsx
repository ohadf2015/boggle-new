/**
 * Piece D (perf): PageLoader's mascot priority is caller-controlled.
 * Default stays `priority` (existing callers unchanged); the generic
 * `[locale]/loading.tsx` boundary opts out so a loader image never competes
 * with the page's real first paint.
 */
import { render, screen } from '@testing-library/react';
import { PageLoader } from '../PageLoader';

vi.mock('../Mascot', () => ({
  Mascot: ({ priority }: { priority?: boolean }) => (
    <div data-testid="mascot" data-priority={String(Boolean(priority))} />
  ),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ prefersReducedMotion: false, enableComplexAnimations: true }),
}));

describe('PageLoader mascot priority', () => {
  it('shouldKeepPriorityByDefault', () => {
    render(<PageLoader />);
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-priority', 'true');
  });

  it('shouldDropPriorityWhenTheCallerOptsOut', () => {
    render(<PageLoader priority={false} />);
    expect(screen.getByTestId('mascot')).toHaveAttribute('data-priority', 'false');
  });
});
