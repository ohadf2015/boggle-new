import { describe, it, expect } from 'vitest';
import {
  LOBBY_EMOTES,
  LOBBY_EMOTE_IDS,
  isLobbyEmoteId,
  type LobbyEmoteId,
} from '@/lib/lobby/lobbyEmotes';
import {
  AVATAR_MOODS,
  MOOD_EXPRESSIONS,
  MOOD_DURATION_MS,
} from '@/lib/avatar/avatarMood';
import {
  AVATAR_EYE_STYLES,
  AVATAR_EYEBROW_STYLES,
  AVATAR_MOUTH_STYLES,
} from '@/shared/types/customAvatar';

describe('lobbyEmotes — pure metadata', () => {
  it('exposes a non-empty, deduplicated emote list', () => {
    expect(LOBBY_EMOTES.length).toBeGreaterThan(0);
    const ids = LOBBY_EMOTES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...LOBBY_EMOTE_IDS].sort()).toEqual([...ids].sort());
  });

  it('every emote has emoji + labelKey under the lobby.emote namespace', () => {
    for (const e of LOBBY_EMOTES) {
      expect(e.emoji.length).toBeGreaterThan(0);
      expect(e.labelKey).toMatch(/^lobby\.emote\./);
    }
  });

  it('every emote id is also a real AvatarMood (single render path)', () => {
    for (const id of LOBBY_EMOTE_IDS) {
      expect(AVATAR_MOODS).toContain(id);
    }
  });

  it('every emote maps to a defined, transient mood expression', () => {
    for (const id of LOBBY_EMOTE_IDS) {
      const expr = MOOD_EXPRESSIONS[id];
      expect(expr).toBeDefined();
      // emotes auto-clear → must have a positive lifetime (not a persistent state)
      expect(MOOD_DURATION_MS[id]).toBeGreaterThan(0);
    }
  });

  it('every emote face-swap uses valid avatar part enum values', () => {
    for (const id of LOBBY_EMOTE_IDS) {
      const expr = MOOD_EXPRESSIONS[id];
      if (expr.eyes) expect(AVATAR_EYE_STYLES).toContain(expr.eyes);
      if (expr.eyebrows) expect(AVATAR_EYEBROW_STYLES).toContain(expr.eyebrows);
      if (expr.mouth) expect(AVATAR_MOUTH_STYLES).toContain(expr.mouth);
    }
  });

  describe('isLobbyEmoteId guard', () => {
    it('accepts real emote ids', () => {
      for (const id of LOBBY_EMOTE_IDS) {
        expect(isLobbyEmoteId(id)).toBe(true);
      }
    });

    it('rejects game moods and junk', () => {
      expect(isLobbyEmoteId('correct')).toBe(false);
      expect(isLobbyEmoteId('idle')).toBe(false);
      expect(isLobbyEmoteId('')).toBe(false);
      expect(isLobbyEmoteId('nope')).toBe(false);
      expect(isLobbyEmoteId(undefined)).toBe(false);
      expect(isLobbyEmoteId(42)).toBe(false);
    });
  });

  it('includes the user-named expressions (angry, silly/funny, wink)', () => {
    const ids = LOBBY_EMOTE_IDS as readonly LobbyEmoteId[];
    expect(ids).toContain('emoteAngry');
    expect(ids).toContain('emoteSilly');
    expect(ids).toContain('emoteWink');
  });
});
