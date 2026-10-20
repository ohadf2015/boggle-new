/**
 * MobileTabBar must lay itself out with its own utility classes. Its old
 * `.mobile-tab-bar` rule lives in animations.css, which AnimationsLoader
 * imports AFTER page load — until then the tabs stacked vertically in a tall
 * block over the global bottom nav on the Word Hunt results screen.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
  }),
}));

import { MobileTabBar } from '../MobileTabBar';

describe('MobileTabBar', () => {
  it('is a horizontal flex row without depending on the lazy animations.css', () => {
    render(
      <MobileTabBar
        tabs={[
          { id: 'results', icon: <i />, label: 'Results' },
          { id: 'stats', icon: <i />, label: 'Stats' },
        ]}
        activeTab="results"
        onTabChange={() => {}}
      />,
    );
    const nav = screen.getByRole('navigation');
    const cls = nav.className.split(/\s+/);
    expect(cls).toContain('flex');
    expect(cls).toContain('items-center');
    expect(cls).toContain('justify-around');
    expect(cls).not.toContain('flex-col');
  });
});
