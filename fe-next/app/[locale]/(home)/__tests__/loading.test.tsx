import React from 'react';
import { render } from '@testing-library/react';
import Loading from '../loading';

describe('(home)/loading — lightweight dancing mascot', () => {
  // The homepage loading state is now a single random dancing mascot on the dark
  // canvas. The old page-shaped skeleton (season strip + hero + cubes bento) is
  // gone: a busy skeleton that then swaps to the real landing read as its own
  // flash, and "skeleton + moving mascot" felt off.
  it('shows a dancing mascot and no skeleton scaffolding', () => {
    const { getByTestId, queryByTestId } = render(<Loading />);
    expect(getByTestId('dancing-mascot')).toBeTruthy();
    expect(queryByTestId('loading-season-strip')).toBeNull();
    expect(queryByTestId('landing-cubes-skeleton')).toBeNull();
  });

  // Regression guard: the loader must use the light static POSE (~45–94KB PNG)
  // that "dances" via a CSS keyframe — NOT the pre-rendered animated WebP loop
  // (294–973KB), which stole boot bandwidth on the critical path. A previous
  // commit put a 770KB k_pop.webp here and measurably slowed first load.
  it('uses a static PNG pose + CSS dance, never a heavy animated webp', () => {
    const { getByTestId } = render(<Loading />);
    const mascot = getByTestId('dancing-mascot');
    const src = mascot.getAttribute('src') || '';
    expect(src).toMatch(/\/mascots\/styles\/.+\.png$/);
    expect(src).not.toMatch(/\.webp$/);
    // k_pop.png (320KB outlier) is excluded from the loader pool.
    expect(src).not.toContain('k_pop');
    expect(mascot.parentElement?.className).toMatch(/hero-dance-/);
  });
});
