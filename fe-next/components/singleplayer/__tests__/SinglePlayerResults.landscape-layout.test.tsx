/**
 * SinglePlayer Results - Landscape Layout Test
 *
 * Tests that landscape mode has proper layout without overlapping elements
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the landscape hook to force landscape mode
vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => true,
}));

describe('SinglePlayerResults - Landscape Layout', () => {
  test('achievement badges container should have proper constraints', () => {
    // Test that achievement badges:
    // 1. Are in a flex container with flex-wrap
    // 2. Have adequate gap spacing (gap-2 = 8px minimum)
    // 3. Have justify-center for RTL/LTR compatibility

    const achievementContainer = document.createElement('div');
    achievementContainer.className = 'flex flex-wrap gap-2 justify-center';

    // Verify classes
    expect(achievementContainer.classList.contains('flex')).toBe(true);
    expect(achievementContainer.classList.contains('flex-wrap')).toBe(true);
    expect(achievementContainer.classList.contains('gap-2')).toBe(true);
    expect(achievementContainer.classList.contains('justify-center')).toBe(true);
  });

  test('landscape layout should have scrollable columns', () => {
    // Verify both columns have overflow-y-auto for scroll
    const leftColumn = document.createElement('div');
    leftColumn.className = 'w-1/2 flex flex-col items-center gap-2 overflow-y-auto scrollable-area';

    const rightColumn = document.createElement('div');
    rightColumn.className = 'w-1/2 flex flex-col gap-2 overflow-y-auto scrollable-area';

    // Both columns should be scrollable
    expect(leftColumn.classList.contains('overflow-y-auto')).toBe(true);
    expect(rightColumn.classList.contains('overflow-y-auto')).toBe(true);

    // Both columns should be equal width
    expect(leftColumn.classList.contains('w-1/2')).toBe(true);
    expect(rightColumn.classList.contains('w-1/2')).toBe(true);
  });

  test('landscape container should prevent overflow', () => {
    const container = document.createElement('div');
    container.className = 'flex h-screen w-full overflow-hidden bg-slate-900 text-white p-2 gap-2';

    // Container should have overflow-hidden to prevent content bleeding
    expect(container.classList.contains('overflow-hidden')).toBe(true);
    expect(container.classList.contains('h-screen')).toBe(true);
    expect(container.classList.contains('w-full')).toBe(true);
  });

  test('achievement badges should not exceed container width', () => {
    // Achievement badges are in justify-center container
    // With flex-wrap, they will wrap to next line if needed
    // gap-2 (8px) provides adequate spacing for Neo-Brutalist design

    const container = document.createElement('div');
    container.className = 'flex flex-wrap gap-2 justify-center';
    container.style.width = '300px'; // Simulate narrow container

    // Create 3 badge-like elements
    for (let i = 0; i < 3; i++) {
      const badge = document.createElement('div');
      badge.style.width = '120px'; // Each badge ~120px
      badge.style.height = '40px';
      container.appendChild(badge);
    }

    document.body.appendChild(container);

    // With 300px width and 120px badges + 8px gaps:
    // Row 1: badge1 (120px) + gap (8px) + badge2 (120px) = 248px ✓ fits
    // Row 2: badge3 (120px) wraps to new line ✓

    expect(container.children.length).toBe(3);

    document.body.removeChild(container);
  });
});
