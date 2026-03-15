import { render } from '@testing-library/react';
import { GameLayout } from '../GameLayout';

describe('GameLayout', () => {
  it('gives sidebar a compact fixed height on mobile (h-16)', () => {
    const { container } = render(
      <GameLayout
        header={<div>header</div>}
        gridArea={<div>grid</div>}
        sidebar={<div data-testid="sidebar">sidebar</div>}
      />
    );
    const sidebarChild = container.querySelector('[data-testid="sidebar"]');
    const sidebarWrapper = sidebarChild?.parentElement;
    expect(sidebarWrapper?.className).toContain('h-16');
    expect(sidebarWrapper?.className).not.toContain('max-h-[20vh]');
  });

  it('switches to row layout in landscape for mobile', () => {
    const { container } = render(
      <GameLayout
        header={<div>header</div>}
        gridArea={<div>grid</div>}
        sidebar={<div data-testid="sidebar">sidebar</div>}
      />
    );
    const mainContent = container.querySelector('.flex-1.min-h-0');
    expect(mainContent?.className).toContain('landscape:flex-row');
  });
});
