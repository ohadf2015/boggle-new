/**
 * NavigationProvider feeds the in-app route history on every client-side route
 * change, so `mpExit('back-from-entry')` can return to the page the player came
 * from — `document.referrer` never updates on SPA navigation.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

let mockPathname = '/en/daily';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { NavigationProvider } from '../NavigationContext';
import { getTrackedPreviousPath, resetInAppPathHistory } from '@/contexts/NavigationContext';

function setUrl(path: string) {
  window.history.replaceState({}, '', path);
  mockPathname = path.split('?')[0];
}

describe('NavigationProvider — previous in-app path', () => {
  beforeEach(() => {
    resetInAppPathHistory();
  });

  it('records each client-side route change (with its query)', () => {
    setUrl('/en/daily?date=2026-09-26');
    const { rerender } = render(<NavigationProvider><div /></NavigationProvider>);
    expect(getTrackedPreviousPath()).toBeNull();

    setUrl('/en/multiplayer');
    rerender(<NavigationProvider><div /></NavigationProvider>);
    expect(getTrackedPreviousPath()).toBe('/en/daily?date=2026-09-26');
  });
});
