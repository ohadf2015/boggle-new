import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PreGameTutorial from '../PreGameTutorial';

/** The pre-game avatar builder's DONE only closed the modal — the look was never saved. */

const auth = vi.hoisted(() => ({ isAuthenticated: false, profile: null as unknown, updateProfile: vi.fn() }));
const storage = vi.hoisted(() => ({ setStoredCustomAvatar: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/utils/profileStorage', async (orig) => ({ ...(await orig<object>()), setStoredCustomAvatar: storage.setStoredCustomAvatar }));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: (_t, tag: string) => ({ children, ...p }: { children?: React.ReactNode }) => {
    const rest = Object.fromEntries(Object.entries(p).filter(([k]) => !['initial', 'animate', 'transition', 'whileHover', 'whileTap', 'exit'].includes(k)));
    return React.createElement(tag, rest, children);
  } }),
}));
vi.mock('@/components/boosts/BoostButton', () => ({ BoostButton: () => null }));
vi.mock('@/components/ui/Mascot', () => ({ Mascot: () => null }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/components/avatar/AvatarBuilderModal', () => ({
  default: ({ isOpen, onSave }: { isOpen: boolean; onSave: (c: unknown) => void }) =>
    isOpen ? <button data-testid="builder-save" onClick={() => onSave({ gender: 'female' })}>save</button> : null,
}));

function saveFromBuilder() {
  render(<PreGameTutorial onComplete={vi.fn()} />);
  fireEvent.click(screen.getByText('preGameTutorial.buildAvatar'));
  fireEvent.click(screen.getByTestId('builder-save'));
}

describe('PreGameTutorial avatar save', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given a signed-in player, When they save, Then the avatar is written to their profile', async () => {
    auth.isAuthenticated = true;
    auth.profile = { id: 'u1', avatar_config: null };
    auth.updateProfile.mockResolvedValue({ data: {}, error: null });
    saveFromBuilder();
    await waitFor(() => expect(auth.updateProfile).toHaveBeenCalledWith({ avatar_config: { gender: 'female' } }));
  });

  it('Given a guest, When they save, Then the avatar is stored locally', () => {
    auth.isAuthenticated = false;
    auth.profile = null;
    saveFromBuilder();
    expect(storage.setStoredCustomAvatar).toHaveBeenCalledWith({ gender: 'female' });
    expect(auth.updateProfile).not.toHaveBeenCalled();
  });
});
