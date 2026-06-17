import React from 'react';
import { render } from '@testing-library/react';
import Loading from '../loading';

// LandingCubesSkeleton is server-safe but pulls in styling helpers; stub to its
// testid so this test asserts the homepage keeps its rich, page-shaped skeleton.
vi.mock('@/components/landing/LandingCubesSkeleton', () => ({
  LandingCubesSkeleton: () => <div data-testid="landing-cubes-skeleton" />,
}));

describe('(home)/loading (homepage-specific boundary)', () => {
  // The homepage gets its OWN loading boundary via the (home) route group, so its
  // rich skeleton (season strip + hero + cubes) no longer leaks to sibling routes.
  it('renders the homepage skeleton: season strip + cubes bento', () => {
    const { getByTestId } = render(<Loading />);
    expect(getByTestId('loading-season-strip')).toBeTruthy();
    expect(getByTestId('landing-cubes-skeleton')).toBeTruthy();
  });
});
