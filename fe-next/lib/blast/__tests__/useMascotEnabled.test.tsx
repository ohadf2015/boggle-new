/**
 * useMascotEnabled — TDD for the localStorage-backed mascot mute toggle.
 * Default ON. Persisted under `boggle_blast_mascot_enabled`.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { useMascotEnabled, MASCOT_ENABLED_STORAGE_KEY } from '../useMascotEnabled';

function Probe({ onMount }: { onMount: (api: ReturnType<typeof useMascotEnabled>) => void }) {
  const api = useMascotEnabled();
  React.useEffect(() => {
    onMount(api);
  }, [api, onMount]);
  return null;
}

describe('useMascotEnabled', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to ENABLED when no localStorage entry', () => {
    let captured: ReturnType<typeof useMascotEnabled> | null = null;
    render(<Probe onMount={(a) => (captured = a)} />);
    expect(captured!.enabled).toBe(true);
  });

  it('reads existing pref from localStorage on mount', () => {
    localStorage.setItem(MASCOT_ENABLED_STORAGE_KEY, 'false');
    let captured: ReturnType<typeof useMascotEnabled> | null = null;
    render(<Probe onMount={(a) => (captured = a)} />);
    expect(captured!.enabled).toBe(false);
  });

  it('toggle() flips enabled and persists to localStorage', () => {
    let captured: ReturnType<typeof useMascotEnabled> | null = null;
    render(<Probe onMount={(a) => (captured = a)} />);
    expect(captured!.enabled).toBe(true);

    act(() => captured!.toggle());
    expect(captured!.enabled).toBe(false);
    expect(localStorage.getItem(MASCOT_ENABLED_STORAGE_KEY)).toBe('false');

    act(() => captured!.toggle());
    expect(captured!.enabled).toBe(true);
    expect(localStorage.getItem(MASCOT_ENABLED_STORAGE_KEY)).toBe('true');
  });

  it('treats malformed localStorage value as default ON', () => {
    localStorage.setItem(MASCOT_ENABLED_STORAGE_KEY, 'not-a-bool');
    let captured: ReturnType<typeof useMascotEnabled> | null = null;
    render(<Probe onMount={(a) => (captured = a)} />);
    expect(captured!.enabled).toBe(true);
  });
});
