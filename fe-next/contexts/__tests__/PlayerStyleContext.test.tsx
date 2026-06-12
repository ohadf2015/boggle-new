// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PlayerStyleProvider, usePlayerStyle } from '../PlayerStyleContext';
import { STYLES } from '@/lib/playerStyle/styles';
import { ACCENT_VAR } from '@/lib/playerStyle/applyAccent';

// --- mock auth ---
const mockUpdateProfile = vi.fn(async () => ({ data: null, error: null }));
let authState: { isAuthenticated: boolean; isAdmin: boolean; profile: any };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authState.isAuthenticated,
    isAdmin: authState.isAdmin,
    profile: authState.profile,
    updateProfile: mockUpdateProfile,
  }),
}));

function Harness() {
  const { enabled, styleKey, activeStyleKey, isPreviewing, setStyle, previewStyle } = usePlayerStyle();
  return (
    <div>
      <span data-testid="enabled">{String(enabled)}</span>
      <span data-testid="committed">{styleKey}</span>
      <span data-testid="active">{activeStyleKey}</span>
      <span data-testid="previewing">{String(isPreviewing)}</span>
      <button data-testid="set-rock" onClick={() => void setStyle('rock')} />
      <button data-testid="preview-jazz" onClick={() => previewStyle('jazz')} />
      <button data-testid="preview-end" onClick={() => previewStyle(null)} />
    </div>
  );
}

const accent = () => document.documentElement.style.getPropertyValue(ACCENT_VAR);
const admin = (profile: any = { id: 'u1' }) => ({ isAuthenticated: true, isAdmin: true, profile });

describe('PlayerStyleContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty(ACCENT_VAR);
    mockUpdateProfile.mockClear();
    authState = { isAuthenticated: false, isAdmin: false, profile: null };
  });

  it('is disabled for non-admins and forces the default style (no accent)', () => {
    render(<PlayerStyleProvider><Harness /></PlayerStyleProvider>);
    expect(screen.getByTestId('enabled').textContent).toBe('false');
    expect(screen.getByTestId('committed').textContent).toBe('default');
    expect(accent()).toBe('');
  });

  it('forces default for a non-admin even if their profile has a style', () => {
    authState = { isAuthenticated: true, isAdmin: false, profile: { id: 'u1', player_style: 'viking' } };
    render(<PlayerStyleProvider><Harness /></PlayerStyleProvider>);
    expect(screen.getByTestId('committed').textContent).toBe('default');
    expect(accent()).toBe('');
  });

  it('non-admin setStyle / preview are no-ops', async () => {
    authState = { isAuthenticated: true, isAdmin: false, profile: { id: 'u1' } };
    render(<PlayerStyleProvider><Harness /></PlayerStyleProvider>);
    await act(async () => screen.getByTestId('set-rock').click());
    await act(async () => screen.getByTestId('preview-jazz').click());
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(accent()).toBe('');
    expect(screen.getByTestId('active').textContent).toBe('default');
  });

  it('admin setStyle writes to the profile', async () => {
    authState = admin();
    render(<PlayerStyleProvider><Harness /></PlayerStyleProvider>);
    await act(async () => screen.getByTestId('set-rock').click());
    expect(mockUpdateProfile).toHaveBeenCalledWith({ player_style: 'rock' });
  });

  it('reads the committed style from an admin profile and applies its accent', () => {
    authState = admin({ id: 'u1', player_style: 'viking' });
    render(<PlayerStyleProvider><Harness /></PlayerStyleProvider>);
    expect(screen.getByTestId('committed').textContent).toBe('viking');
    expect(accent()).toBe(STYLES.viking.accentHex);
  });

  it('admin preview applies an accent without committing, and reverts on end', async () => {
    authState = admin();
    render(<PlayerStyleProvider><Harness /></PlayerStyleProvider>);
    await act(async () => screen.getByTestId('preview-jazz').click());
    expect(accent()).toBe(STYLES.jazz.accentHex);
    expect(screen.getByTestId('committed').textContent).toBe('default');
    expect(screen.getByTestId('previewing').textContent).toBe('true');
    await act(async () => screen.getByTestId('preview-end').click());
    expect(accent()).toBe('');
  });

  it('admin committing during a preview clears the preview and applies it', async () => {
    // admin + unauthenticated drives the local-state branch so the committed key
    // updates observably (the authed branch persists via updateProfile, whose
    // resulting profile refresh is owned by AuthContext, mocked out here).
    authState = { isAuthenticated: false, isAdmin: true, profile: null };
    render(<PlayerStyleProvider><Harness /></PlayerStyleProvider>);
    await act(async () => screen.getByTestId('preview-jazz').click());
    await act(async () => screen.getByTestId('set-rock').click());
    expect(screen.getByTestId('previewing').textContent).toBe('false');
    expect(screen.getByTestId('committed').textContent).toBe('rock');
    expect(accent()).toBe(STYLES.rock.accentHex);
  });
});
