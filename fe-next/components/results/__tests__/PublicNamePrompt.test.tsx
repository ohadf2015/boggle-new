import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const capture = vi.fn();
const checkPublicName = vi.fn();
const guestSave = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));
vi.mock('@/lib/names/checkPublicName', () => ({ checkPublicName: (n: string) => checkPublicName(n) }));
vi.mock('@/utils/onboardingNameSuggestions', () => ({ suggestPublicPlayerName: () => 'Chewy Jellyfish' }));
vi.mock('@/utils/guestManager', () => ({
  getGuestName: () => 'Sneaky Potato',
  getChosenGuestName: () => null,
}));
vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({ getGuestFingerprint: async () => 'fp1' }));
vi.mock('@/components/daily/results/useGuestNameSave', () => ({
  MAX_GUEST_NAME_LENGTH: 20,
  useGuestNameSave: () => ({ save: guestSave, saving: false, error: null, clearError: vi.fn() }),
}));

import { PublicNamePrompt, PUBLIC_NAME_PROMPT_SHOWN_KEY } from '../PublicNamePrompt';

const signedIn = (name: string, updateProfile = vi.fn().mockResolvedValue({ error: null })) => ({
  loading: false, isAuthenticated: true, isGuest: false, user: { id: 'u1' }, profile: { username: name, display_name: name }, updateProfile,
});
const guest = { loading: false, isAuthenticated: false, isGuest: true, user: null, profile: null, updateProfile: vi.fn() };

describe('PublicNamePrompt', () => {
  beforeEach(() => {
    capture.mockReset(); checkPublicName.mockReset().mockResolvedValue(null); guestSave.mockReset().mockResolvedValue(true);
    localStorage.clear();
  });

  it('Given a guest on a generated name, Then the prompt shows with a one-tap suggestion and the marker is written at show time', () => {
    auth.value = guest;
    render(<PublicNamePrompt mode="quickPlay" />);
    expect(screen.getByTestId('public-name-prompt')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chewy Jellyfish' })).toBeTruthy();
    expect(localStorage.getItem(PUBLIC_NAME_PROMPT_SHOWN_KEY)).toBeTruthy();
    expect(capture).toHaveBeenCalledWith('public_name_prompt_shown', expect.objectContaining({ mode: 'quickPlay', guest: true }));
  });

  it('Given auth is still loading, Then nothing renders (no guest flash)', () => {
    auth.value = { ...guest, loading: true };
    const { container } = render(<PublicNamePrompt mode="quickPlay" />);
    expect(container.innerHTML).toBe('');
  });

  it('Given a signed-in player whose profile has not loaded yet, Then nothing renders and nothing is marked shown', () => {
    auth.value = { ...signedIn('x'), profile: null };
    const { container } = render(<PublicNamePrompt mode="blast" />);
    expect(container.innerHTML).toBe('');
    expect(capture).not.toHaveBeenCalled();
    expect(localStorage.getItem(PUBLIC_NAME_PROMPT_SHOWN_KEY)).toBeNull();
  });

  it('Given a signed-in player with a chosen name, Then nothing renders', () => {
    auth.value = signedIn('Zigzag');
    const { container } = render(<PublicNamePrompt mode="blast" />);
    expect(container.innerHTML).toBe('');
  });

  it('Given edu, or a daily guest (the daily flow owns that prompt), Then nothing renders', () => {
    auth.value = guest;
    expect(render(<PublicNamePrompt mode="edu" />).container.innerHTML).toBe('');
    expect(render(<PublicNamePrompt mode="daily" />).container.innerHTML).toBe('');
  });

  it('Given a signed-in player on a placeholder, When they tap the suggestion and save, Then the profile is updated', async () => {
    const updateProfile = vi.fn().mockResolvedValue({ error: null });
    auth.value = signedIn('Player_abcd1234', updateProfile);
    const onSaved = vi.fn();
    render(<PublicNamePrompt mode="multiplayer" onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chewy Jellyfish' }));
    fireEvent.click(screen.getByTestId('public-name-save'));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ display_name: 'Chewy Jellyfish' }));
    expect(onSaved).toHaveBeenCalledWith('Chewy Jellyfish');
    expect(capture).toHaveBeenCalledWith('public_name_prompt_saved', expect.objectContaining({ mode: 'multiplayer' }));
  });

  it('Given a name the server rejects, Then the reason shows and nothing is saved', async () => {
    const updateProfile = vi.fn();
    auth.value = signedIn('Player_abcd1234', updateProfile);
    checkPublicName.mockResolvedValue('profane');
    render(<PublicNamePrompt mode="single" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'shit' } });
    fireEvent.click(screen.getByTestId('public-name-save'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('publicName.error.profane'));
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('Given a guest, When they save, Then the existing guest name save runs', async () => {
    auth.value = guest;
    render(<PublicNamePrompt mode="tower" />);
    fireEvent.click(screen.getByRole('button', { name: 'Chewy Jellyfish' }));
    await waitFor(() => expect((screen.getByTestId('public-name-save') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByTestId('public-name-save'));
    await waitFor(() => expect(guestSave).toHaveBeenCalledWith('Chewy Jellyfish', 'prompt'));
  });
});
