import { render } from '@testing-library/react';
import { GameLayout } from '../GameLayout';

describe('GameLayout', () => {
  it('gives sidebar a fixed 96px height on mobile (not max-h-[20vh])', () => {
    const { container } = render(
      <GameLayout
        header={<div>header</div>}
        gridArea={<div>grid</div>}
        sidebar={<div data-testid="sidebar">sidebar</div>}
      />
    );
    // The sidebar wrapper has flex-shrink-0 and lg:h-full but NOT z-20 (that's the header)
    // We select the wrapper that contains the sidebar child
    const sidebarChild = container.querySelector('[data-testid="sidebar"]');
    const sidebarWrapper = sidebarChild?.parentElement;
    expect(sidebarWrapper?.className).toContain('h-24');
    expect(sidebarWrapper?.className).not.toContain('max-h-[20vh]');
  });
});
