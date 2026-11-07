/**
 * A locale switch remounts the [locale] layout's <html>; React strips every
 * attribute on it during that commit, after the tree was already decided in
 * render. The decided tree must be back on <html> before paint, or a returning
 * user sees the fresh tree hidden and the marketing tail shown.
 */
import React, { useLayoutEffect } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useHomeTree } from '../homeTree';

function StripHtmlAttributes() {
  useLayoutEffect(() => {
    document.documentElement.removeAttribute('data-home');
  }, []);
  return null;
}

function TreeProbe() {
  const tree = useHomeTree();
  return <span data-testid="tree">{tree}</span>;
}

describe('useHomeTree after an <html> remount', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as any).Capacitor;
    document.documentElement.removeAttribute('data-home');
  });

  it('puts the returning tree back on <html> once the commit stripped it', () => {
    // Given a returning visitor
    localStorage.setItem('lexiclash_onboarding_completed', 'true');

    // When the commit wipes <html> attributes before the home tree's effects run
    render(
      <>
        <StripHtmlAttributes />
        <TreeProbe />
      </>
    );

    // Then the returning tree is on <html> again before paint
    expect(document.documentElement.getAttribute('data-home')).toBe('returning');
  });

  it('puts the native app back on the returning tree too', () => {
    (window as any).Capacitor = { isNativePlatform: () => true };

    render(
      <>
        <StripHtmlAttributes />
        <TreeProbe />
      </>
    );

    expect(document.documentElement.getAttribute('data-home')).toBe('returning');
  });
});
