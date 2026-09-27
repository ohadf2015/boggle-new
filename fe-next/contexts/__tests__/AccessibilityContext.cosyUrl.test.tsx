import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccessibilityProvider, useCosyMode } from '../AccessibilityContext';

function Probe() {
  return <span data-testid="cosy">{useCosyMode() ? 'on' : 'off'}</span>;
}

function setSearch(search: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search },
    writable: true,
    configurable: true,
  });
}

describe('AccessibilityProvider ?cosy= URL override', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-cosy');
  });
  afterEach(() => setSearch(''));

  it('?cosy=1 forces cosy ON (default is OFF)', () => {
    setSearch('?cosy=1');
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>,
    );
    expect(screen.getByTestId('cosy').textContent).toBe('on');
    expect(document.documentElement.dataset.cosy).toBe('true');
  });

  it('?cosy=0 forces cosy OFF even if stored ON', () => {
    localStorage.setItem(
      'boggle_accessibility_settings',
      JSON.stringify({ cosyMode: true }),
    );
    setSearch('?cosy=0');
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>,
    );
    expect(screen.getByTestId('cosy').textContent).toBe('off');
    expect(document.documentElement.dataset.cosy).toBeUndefined();
  });

  it('no ?cosy param falls back to stored setting', () => {
    localStorage.setItem(
      'boggle_accessibility_settings',
      JSON.stringify({ cosyMode: true }),
    );
    setSearch('');
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>,
    );
    expect(screen.getByTestId('cosy').textContent).toBe('on');
  });
});
