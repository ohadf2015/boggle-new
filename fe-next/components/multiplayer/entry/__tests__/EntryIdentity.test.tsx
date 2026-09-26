/**
 * Identity is part of the entry, not a modal over it (DESIGN §a/§b.1): a 64px
 * avatar with a reroll badge, an inline name field, and a rank badge when
 * signed in. Storage/auth are read AFTER mount (the entry is SSR'd — reading
 * localStorage in render is a hydration mismatch) and never before auth
 * resolves (a signed-in player must not flash a guest name — pitfall class 1).
 * A signed-in avatar is never randomised: it carries purchased items.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const CFG_A = { bgColor: '#111111', skinColor: '#aaaaaa' };
const CFG_B = { bgColor: '#222222', skinColor: '#bbbbbb' };
const setStoredUsername = vi.fn();
const setStoredCustomAvatar = vi.fn();
const updateProfile = vi.fn(() => Promise.resolve());
let authState: { loading: boolean; profile: Record<string, unknown> | null } = { loading: false, profile: null };
let storedName = 'Guesty';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/utils/profileStorage', () => ({
  getOrCreateStoredUsername: () => storedName,
  getOrCreateStoredCustomAvatar: () => CFG_A,
  setStoredUsername: (n: string) => setStoredUsername(n),
  setStoredCustomAvatar: (c: unknown) => setStoredCustomAvatar(c),
}));
vi.mock('@/shared/types/customAvatar', () => ({ getRandomAvatarConfig: () => CFG_B }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ ...authState, updateProfile }),
}));
vi.mock('@/components/avatar/AvatarRenderer', () => ({
  __esModule: true,
  default: ({ config }: { config: { bgColor: string } }) => <div data-testid="avatar-renderer" data-bg={config.bgColor} />,
}));
vi.mock('@/components/multiplayer/EloRankBadge', () => ({
  EloRankBadge: ({ rating }: { rating: number }) => <div data-testid="rank-badge">{rating}</div>,
}));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => null }));
const playSound = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playSound }) }));

import { EntryIdentity } from '../EntryIdentity';

describe('EntryIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { loading: false, profile: null };
    storedName = 'Guesty';
  });

  it('guest: fills the stored (or generated) name and avatar after mount', () => {
    render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);
    expect((screen.getByLabelText('mpUi.entry.nameAria') as HTMLInputElement).value).toBe('Guesty');
    expect(screen.getByTestId('avatar-renderer').getAttribute('data-bg')).toBe(CFG_A.bgColor);
  });

  it('guest: the reroll badge rolls and stores a new avatar', () => {
    render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'mpUi.entry.rerollAvatar' }));
    expect(setStoredCustomAvatar).toHaveBeenCalledWith(CFG_B);
    expect(screen.getByTestId('avatar-renderer').getAttribute('data-bg')).toBe(CFG_B.bgColor);
  });

  it('guest: a valid rename is stored on blur', () => {
    render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);
    const input = screen.getByLabelText('mpUi.entry.nameAria');
    fireEvent.change(input, { target: { value: '  Word Wizard ' } });
    fireEvent.blur(input);
    expect(setStoredUsername).toHaveBeenCalledWith('Word Wizard');
  });

  it('guest: an invalid name is not stored and says why', () => {
    render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);
    const input = screen.getByLabelText('mpUi.entry.nameAria');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(setStoredUsername).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('guest: a reroll pops with a sound cue (allowed off the game screen)', () => {
    render(<EntryIdentity isAuthenticated={false} displayName={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'mpUi.entry.rerollAvatar' }));
    expect(playSound).toHaveBeenCalledWith('tileAppear', expect.objectContaining({ requiresGameActive: false }));
  });

  it('signed in: shows the account name, never offers a random reroll', () => {
    render(<EntryIdentity isAuthenticated displayName="NeoPlayer" profileAvatar={CFG_A as never} />);
    expect((screen.getByLabelText('mpUi.entry.nameAria') as HTMLInputElement).value).toBe('NeoPlayer');
    expect(screen.queryByRole('button', { name: 'mpUi.entry.rerollAvatar' })).toBeNull();
  });

  it('signed in: Enter commits a rename to the profile', () => {
    render(<EntryIdentity isAuthenticated displayName="NeoPlayer" profileAvatar={CFG_A as never} />);
    const input = screen.getByLabelText('mpUi.entry.nameAria');
    fireEvent.change(input, { target: { value: 'Neo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(updateProfile).toHaveBeenCalledWith({ display_name: 'Neo' });
    expect(setStoredUsername).not.toHaveBeenCalled();
  });

  it('while auth is resolving: a placeholder, no guest identity flash', () => {
    authState = { loading: true, profile: null };
    render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);
    expect(screen.getByTestId('entry-identity-skeleton')).toBeInTheDocument();
    expect(screen.queryByLabelText('mpUi.entry.nameAria')).toBeNull();
  });

  // The entry is SSR'd with the placeholder and swaps to the real card after
  // mount. On desktop the card grows a tagline row and 3xl type, so a skeleton
  // that only mirrors the avatar made the card jump ~56px at 1440x900 (CLS).
  // Every text row the ready card has, the placeholder reserves with the SAME
  // classes (contents hidden).
  it('placeholder reserves the same text rows as the ready card (no shift on swap)', () => {
    const slots = (root: HTMLElement) =>
      Object.fromEntries(
        Array.from(root.querySelectorAll<HTMLElement>('[data-slot]')).map((el) => [
          el.dataset.slot,
          el.className.replace(/\binvisible\b/g, '').replace(/\s+/g, ' ').trim(),
        ]),
      );
    authState = { loading: true, profile: null };
    const { unmount } = render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);
    const skeleton = slots(screen.getByTestId('entry-identity-skeleton'));
    unmount();
    authState = { loading: false, profile: null };
    render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);
    const ready = slots(screen.getByTestId('entry-identity'));
    expect(Object.keys(ready).sort()).toEqual(['avatar', 'label', 'tagline', 'text']);
    expect(skeleton).toEqual(ready);
  });

  it('signed in with a rating: shows the rank badge', () => {
    authState = { loading: false, profile: { ranked_mmr: 1234 } };
    render(<EntryIdentity isAuthenticated displayName="NeoPlayer" profileAvatar={CFG_A as never} />);
    expect(screen.getByTestId('rank-badge').textContent).toBe('1234');
  });

  it('flashes a saved stamp after a successful rename', () => {
    vi.useFakeTimers();
    render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);
    const input = screen.getByLabelText('mpUi.entry.nameAria');
    fireEvent.change(input, { target: { value: 'Stamp Me' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('entry-name-saved')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByTestId('entry-name-saved')).toBeNull();
    vi.useRealTimers();
  });

  // Generated guest names run long ("Unhinged Flamingo", 17): at 24px Fredoka the
  // phone field shows ~16 characters, so the player's own name was clipped. The
  // phone size steps down with length; the row keeps one line height so a long
  // name never shifts the card.
  it.each([
    ['Guesty', 'text-2xl!'],
    ['Unhinged Flamingo', 'text-xl!'],
    ['Extremely Long Namez', 'text-lg!'],
  ])('fits %s on a phone (%s), on a fixed line height', (name, size) => {
    storedName = name;
    render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);
    const input = screen.getByLabelText('mpUi.entry.nameAria');
    const tokens = input.className.split(/\s+/);
    expect(tokens).toContain(size);
    expect(tokens.filter((c) => /^text-(?:lg|xl|2xl)!$/.test(c))).toEqual([size]);
    expect(tokens).toContain('leading-8!');
  });

  it('the placeholder reserves the fixed name line height too', () => {
    authState = { loading: true, profile: null };
    render(<EntryIdentity isAuthenticated={false} displayName="" profileAvatar={null} />);
    const row = screen.getByTestId('entry-identity-skeleton').querySelector('[data-slot="text"] > div');
    expect(row?.className.split(/\s+/)).toContain('leading-8!');
  });
});
