// NativeSelectionGuard tags <html> with `lexi-native` only inside the Capacitor
// app. Global CSS keys off that class to kill the long-press text/image callout
// (Translate/Copy/Share) that makes the native webview look broken — while web
// keeps normal selection for SEO/content pages.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { NativeSelectionGuard } from '../NativeSelectionGuard';

const isNative = vi.fn();
vi.mock('@/utils/platform', () => ({
  isNative: () => isNative(),
}));

const NATIVE_CLASS = 'lexi-native';

describe('NativeSelectionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove(NATIVE_CLASS);
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove(NATIVE_CLASS);
  });

  it('renders nothing', () => {
    isNative.mockReturnValue(false);
    const { container } = render(<NativeSelectionGuard />);
    expect(container.firstChild).toBeNull();
  });

  it('adds the lexi-native class to <html> when running in the native app', () => {
    isNative.mockReturnValue(true);
    render(<NativeSelectionGuard />);
    expect(document.documentElement.classList.contains(NATIVE_CLASS)).toBe(true);
  });

  it('does NOT add the class on the web (keeps text selectable)', () => {
    isNative.mockReturnValue(false);
    render(<NativeSelectionGuard />);
    expect(document.documentElement.classList.contains(NATIVE_CLASS)).toBe(false);
  });

  it('removes the class on unmount so it cannot leak between roots', () => {
    isNative.mockReturnValue(true);
    const { unmount } = render(<NativeSelectionGuard />);
    expect(document.documentElement.classList.contains(NATIVE_CLASS)).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains(NATIVE_CLASS)).toBe(false);
  });

  it('does not strip a pre-existing class on web unmount (no false removal)', () => {
    // Guard against removing a class some other code legitimately set.
    document.documentElement.classList.add(NATIVE_CLASS);
    isNative.mockReturnValue(false);
    const { unmount } = render(<NativeSelectionGuard />);
    unmount();
    expect(document.documentElement.classList.contains(NATIVE_CLASS)).toBe(true);
  });
});
