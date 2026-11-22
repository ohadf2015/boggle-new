import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bundleT } from './localeBundles';

vi.mock('@/contexts/LanguageContext', async () => {
  const { bundleT: bt } = await import('./localeBundles');
  return { useLanguage: () => ({ t: bt('en'), language: 'en', dir: 'ltr' }) };
});
vi.mock('@/utils/profileStorage', () => ({
  getOrCreateStoredUsername: () => 'Guesty',
  getOrCreateStoredCustomAvatar: () => ({ bgColor: '#123456', skinColor: '#654321' }),
  setStoredUsername: vi.fn(),
  setStoredCustomAvatar: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ updateProfile: () => Promise.resolve(), loading: false, profile: null }) }));
vi.mock('@/components/avatar/AvatarRenderer', () => ({ __esModule: true, default: () => <div /> }));

import CreateSheet from '../CreateSheet';

const en = bundleT('en');
const KEY = 'lc-room-visibility';
const base = {
  isOpen: true, onClose: vi.fn(), isCreating: false, defaultLanguage: 'en' as const,
  isAuthenticated: true, displayName: 'NeoPlayer', profileAvatar: null,
};
const option = (key: string) => screen.getByRole('radio', { name: new RegExp(en(`mpUi.entry.${key}`), 'i') });
const start = () => fireEvent.click(screen.getByTestId('create-start-battle'));

describe('CreateSheet room visibility', () => {
  beforeEach(() => localStorage.clear());

  it('Given a first-time host, When the sheet opens, Then Public is picked and the room is created public', () => {
    const onCreate = vi.fn();
    render(<CreateSheet {...base} onCreate={onCreate} />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(option('visibilityPublic')).toHaveAttribute('aria-checked', 'true');
    start();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'public' }));
  });

  it('Given a host picks Private, When they create, Then the room is private and the choice is remembered on this device', () => {
    const onCreate = vi.fn();
    render(<CreateSheet {...base} onCreate={onCreate} />);
    fireEvent.click(option('visibilityPrivate'));
    expect(screen.getByText(en('mpUi.entry.visibilityPrivateHint'))).toBeInTheDocument();
    start();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'private' }));
    expect(localStorage.getItem(KEY)).toBe('private');
  });

  it('Given a host who chose Friends before, When the sheet opens again, Then Friends is still picked', () => {
    localStorage.setItem(KEY, 'friends');
    const onCreate = vi.fn();
    render(<CreateSheet {...base} onCreate={onCreate} />);
    expect(option('visibilityFriends')).toHaveAttribute('aria-checked', 'true');
    start();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'friends' }));
  });

  it('Given a guest, When they tap Friends, Then it stays off, the reason shows, and nothing is created as friends', () => {
    const onCreate = vi.fn();
    render(<CreateSheet {...base} isAuthenticated={false} displayName={null} onCreate={onCreate} />);
    const friends = option('visibilityFriends');
    expect(friends).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(friends);
    expect(friends).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(en('mpUi.entry.visibilityFriendsGuest'))).toBeInTheDocument();
    start();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'public' }));
  });

  it('Given a signed-in host saved Friends but auth has not resolved yet, When rendered as a guest, Then the room falls back to Private and the saved choice is kept', () => {
    localStorage.setItem(KEY, 'friends');
    const onCreate = vi.fn();
    render(<CreateSheet {...base} isAuthenticated={false} displayName={null} onCreate={onCreate} />);
    expect(option('visibilityPrivate')).toHaveAttribute('aria-checked', 'true');
    start();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ visibility: 'private' }));
    expect(localStorage.getItem(KEY)).toBe('friends');
  });

  it('Given storage holds junk, When the sheet opens, Then Public is picked', () => {
    localStorage.setItem(KEY, 'everyone');
    render(<CreateSheet {...base} onCreate={vi.fn()} />);
    expect(option('visibilityPublic')).toHaveAttribute('aria-checked', 'true');
  });
});
