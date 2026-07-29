/**
 * AdventureEffectsLayer Edge Vignette Flash Tests (C3 Task)
 *
 * Tests for the new showEdgeVignetteFlash prop that renders a red
 * radial-gradient overlay around the screen edges (boss counter).
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AdventureEffectsLayer } from '../AdventureEffectsLayer';

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('AdventureEffectsLayer edge vignette', () => {
  it('does not render vignette when showEdgeVignetteFlash=false', () => {
    const { container } = render(<AdventureEffectsLayer showEdgeVignetteFlash={false} />);
    expect(container.querySelector('[data-testid="edge-vignette"]')).toBeNull();
  });

  it('renders vignette overlay when showEdgeVignetteFlash=true', () => {
    const { container } = render(<AdventureEffectsLayer showEdgeVignetteFlash={true} />);
    expect(container.querySelector('[data-testid="edge-vignette"]')).toBeInTheDocument();
  });
});
