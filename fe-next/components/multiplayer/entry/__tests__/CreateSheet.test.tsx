/**
 * CREATE (DESIGN §b.2) is an MpSheet inside the entry, not a page modal. The
 * name comes from the entry identity, so a player with a valid name creates in
 * ONE tap: no name step, 5 flag chips (only the active one labelled), room name
 * behind a "+ name" link, one START BATTLE. The default room name keeps its
 * possessive ("Guestyʼs Room", not the sanitizer-mangled "Guestys Room").
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bundleT } from './localeBundles';

const CFG = { bgColor: '#123456', skinColor: '#654321' };
const setStoredUsername = vi.fn();
const setStoredCustomAvatar = vi.fn();
const updateProfile = vi.fn(() => Promise.resolve());
let storedName = 'Guesty';

vi.mock('@/contexts/LanguageContext', async () => {
  const { bundleT: bt } = await import('./localeBundles');
  const t = bt('en');
  return { useLanguage: () => ({ t, language: 'en', dir: 'ltr' }) };
});
vi.mock('@/utils/profileStorage', () => ({
  getOrCreateStoredUsername: () => storedName,
  getOrCreateStoredCustomAvatar: () => CFG,
  setStoredUsername: (n: string) => setStoredUsername(n),
  setStoredCustomAvatar: (c: unknown) => setStoredCustomAvatar(c),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ updateProfile, loading: false, profile: null }) }));
vi.mock('@/components/avatar/AvatarRenderer', () => ({ __esModule: true, default: () => <div data-testid="avatar-renderer" /> }));

import CreateRoomModal from '../../CreateRoomModal';

const en = bundleT('en');
const props = {
  isOpen: true, onClose: vi.fn(), isCreating: false, onCreate: vi.fn(), defaultLanguage: 'en' as const,
  isAuthenticated: false, displayName: null as string | null, profileAvatar: null,
};
const startBattle = () => screen.getByRole('button', { name: new RegExp(en('mpUi.entry.startBattle'), 'i') });

describe('CreateSheet (via the CreateRoomModal re-export)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storedName = 'Guesty';
  });

  it('is a dialog titled for a new room', () => {
    render(<CreateRoomModal {...props} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(en('mpUi.entry.createTitle'))).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<CreateRoomModal {...props} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a known name skips the name step: one tap creates with an unmangled default room name', () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal {...props} onCreate={onCreate} />);
    expect(screen.queryByRole('textbox', { name: en('mpUi.entry.nameAria') })).toBeNull();
    expect(screen.getByText('Guesty')).toBeInTheDocument();
    fireEvent.click(startBattle());
    expect(onCreate).toHaveBeenCalledWith({ hostUsername: 'Guesty', roomName: 'Guestyʼs Room', language: 'en' });
    expect(setStoredUsername).toHaveBeenCalledWith('Guesty');
    expect(setStoredCustomAvatar).toHaveBeenCalledWith(CFG);
  });

  it('no usable name: the name field shows and START refuses until it is valid', () => {
    storedName = '';
    const onCreate = vi.fn();
    render(<CreateRoomModal {...props} onCreate={onCreate} />);
    const input = screen.getByRole('textbox', { name: en('mpUi.entry.nameAria') });
    fireEvent.click(startBattle());
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Tiler' } });
    fireEvent.click(startBattle());
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ hostUsername: 'Tiler' }));
  });

  it('the name can still be edited on demand', () => {
    render(<CreateRoomModal {...props} />);
    fireEvent.click(screen.getByRole('button', { name: en('mpUi.entry.editName') }));
    expect(screen.getByRole('textbox', { name: en('mpUi.entry.nameAria') })).toBeInTheDocument();
  });

  it('room name sits behind "+ name" and is sanitized', () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal {...props} onCreate={onCreate} />);
    expect(screen.queryByRole('textbox', { name: en('mpUi.entry.roomName') })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: en('mpUi.entry.addRoomName') }));
    fireEvent.change(screen.getByRole('textbox', { name: en('mpUi.entry.roomName') }), { target: { value: 'Friday Clash!' } });
    fireEvent.click(startBattle());
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ roomName: 'Friday Clash' }));
  });

  it('language: one row of 5 flag chips, only the active one labelled', () => {
    render(<CreateRoomModal {...props} defaultLanguage="he" />);
    const chips = screen.getAllByTestId(/^create-lang-/);
    expect(chips).toHaveLength(5);
    const active = chips.filter((c) => c.getAttribute('aria-pressed') === 'true');
    expect(active).toHaveLength(1);
    expect(active[0].getAttribute('data-testid')).toBe('create-lang-he');
    expect(active[0].querySelector('[data-chip-label]')).not.toBeNull();
    chips.filter((c) => c !== active[0]).forEach((c) => expect(c.querySelector('[data-chip-label]')).toBeNull());
  });

  it('picking a flag sets the board language', () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal {...props} onCreate={onCreate} />);
    fireEvent.click(screen.getByTestId('create-lang-sv'));
    fireEvent.click(startBattle());
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ language: 'sv' }));
  });

  it('while creating: START is busy and inert', () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal {...props} isCreating onCreate={onCreate} />);
    const cta = screen.getByTestId('create-start-battle');
    expect(cta).toBeDisabled();
    expect(cta).toHaveAttribute('aria-busy', 'true');
  });

  it('signed in: uses the account name and only writes the profile when it changed', () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal {...props} isAuthenticated displayName="NeoPlayer" profileAvatar={CFG as never} onCreate={onCreate} />);
    fireEvent.click(startBattle());
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ hostUsername: 'NeoPlayer' }));
    expect(updateProfile).toHaveBeenCalledWith({ avatar_config: CFG });
    expect(setStoredUsername).not.toHaveBeenCalled();
  });
});
