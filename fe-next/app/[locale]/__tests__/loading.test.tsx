import React from 'react';
import { render } from '@testing-library/react';
import Loading from '../loading';

// The mascot loader is a client component with device-perf hooks; stub it so the
// test asserts the CHOICE of loader, not its internals.
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ size }: { size?: string }) => <div data-testid="page-loader" data-size={size} />,
}));

describe('[locale]/loading (generic route boundary)', () => {
  // This boundary is inherited by ~90 child routes (practice, blast, crossword,
  // daily, SEO pages) that lack their own loading.tsx. It MUST be page-agnostic —
  // the mascot loader — NOT the homepage cubes skeleton (regression guard).
  it('renders the mascot PageLoader, not the homepage cubes skeleton', () => {
    const { getByTestId, queryByTestId } = render(<Loading />);
    expect(getByTestId('page-loader')).toBeTruthy();
    // Homepage-only artifacts must NOT leak into the shared boundary.
    expect(queryByTestId('loading-season-strip')).toBeNull();
    expect(queryByTestId('landing-cubes-skeleton')).toBeNull();
  });
});
