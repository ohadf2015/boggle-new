import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import type { ProfileData } from '@/contexts/auth/authTypes';

/**
 * updateProfile RETURNS { error } — it never throws. The avatar save used a bare
 * try/await, so a failed write toasted "Saved". And with no saved avatar the
 * editor got a fresh random `initialConfig` every render, which the editor
 * treats as "caller handed a different avatar" and resets the draft.
 */

vi.mock('react-hot-toast', () => ({ __esModule: true, default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: (_t, tag: string) => ({ children, ...p }: { children?: React.ReactNode }) => React.createElement(tag, p, children) }),
  useInView: () => true,
}));
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <div /> }));

const seenConfigs: string[] = [];
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({
  __esModule: true,
  default: ({ isOpen, onSave, initialConfig }: { isOpen: boolean; onSave: (c: unknown) => void; initialConfig: unknown }) => {
    if (!isOpen) return null;
    seenConfigs.push(JSON.stringify(initialConfig));
    return <button data-testid="builder-save" onClick={() => onSave({ gender: 'male' })}>save</button>;
  },
}));

const profile = {
  id: 'u1', username: 'u', display_name: 'User', country_code: 'US',
  created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', total_coins: 0,
  avatar_config: null,
} as unknown as ProfileData;

function renderHeader(updateProfile = vi.fn().mockResolvedValue({ data: null, error: null })) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const props = { profile, isDarkMode: true, updateProfile, refreshProfile: vi.fn().mockResolvedValue(undefined) };
  const ui = (p: typeof props) => <QueryClientProvider client={qc}><ProfileHeader {...p} /></QueryClientProvider>;
  const r = render(ui(props));
  fireEvent.click(screen.getByTitle('profile.chooseAvatar'));
  return { ...r, rerender: () => r.rerender(ui({ ...props })), updateProfile };
}

describe('ProfileHeader avatar save', () => {
  beforeEach(() => { vi.clearAllMocks(); seenConfigs.length = 0; });

  it('Given the write fails, When saving, Then it shows the error toast, not "saved"', async () => {
    renderHeader(vi.fn().mockResolvedValue({ data: null, error: { message: 'rls' } }));
    fireEvent.click(screen.getByTestId('builder-save'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('profile.saveError'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('Given the write succeeds, When saving, Then it shows "saved"', async () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('builder-save'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('profile.saved'));
  });

  it('Given no saved avatar, When the header re-renders, Then the editor keeps the same starting avatar', () => {
    const { rerender } = renderHeader();
    rerender();
    rerender();
    expect(new Set(seenConfigs).size).toBe(1);
  });
});
