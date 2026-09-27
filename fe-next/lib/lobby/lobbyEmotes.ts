/**
 * Lobby emotes — player-triggered face reactions visible to the whole room while
 * waiting for the host to start. Pure metadata: drives the picker tray (emoji +
 * i18n label) and the server Zod enum / client receive-guard.
 *
 * Each emote id is ALSO a real `AvatarMood` (see lib/avatar/avatarMood.ts) so the
 * avatar face-swap reuses the existing transient mood-render path — emotes are just
 * player-chosen moods. This file is the *picker* subset, kept separate from the
 * game-driven moods (correct/streak/win…) so those never appear in the tray.
 *
 * Primary signal is the emoji bubble (universally legible on phone AND TV); the
 * avatar face-swap is the enhancement.
 */
import type { AvatarMood } from '@/lib/avatar/avatarMood';

export interface LobbyEmote {
  /** Constrained to AvatarMood so the id is always renderable via `applyMood`. */
  readonly id: Extract<
    AvatarMood,
    | 'emoteLaugh'
    | 'emoteAngry'
    | 'emoteWink'
    | 'emoteSilly'
    | 'emoteLove'
    | 'emoteShock'
    | 'emoteCool'
  >;
  readonly emoji: string;
  readonly labelKey: string;
}

export type LobbyEmoteId = LobbyEmote['id'];

export const LOBBY_EMOTES: readonly LobbyEmote[] = [
  { id: 'emoteLaugh', emoji: '😂', labelKey: 'lobby.emote.laugh' },
  { id: 'emoteAngry', emoji: '😠', labelKey: 'lobby.emote.angry' },
  { id: 'emoteWink', emoji: '😉', labelKey: 'lobby.emote.wink' },
  { id: 'emoteSilly', emoji: '😜', labelKey: 'lobby.emote.silly' },
  { id: 'emoteLove', emoji: '😍', labelKey: 'lobby.emote.love' },
  { id: 'emoteShock', emoji: '😮', labelKey: 'lobby.emote.shock' },
  { id: 'emoteCool', emoji: '😎', labelKey: 'lobby.emote.cool' },
] as const;

export const LOBBY_EMOTE_IDS: readonly LobbyEmoteId[] = LOBBY_EMOTES.map(
  (e) => e.id,
);

const LOBBY_EMOTE_ID_SET: ReadonlySet<string> = new Set(LOBBY_EMOTE_IDS);

/** Runtime guard for the server Zod enum + client receive path. */
export function isLobbyEmoteId(value: unknown): value is LobbyEmoteId {
  return typeof value === 'string' && LOBBY_EMOTE_ID_SET.has(value);
}

/** Lookup helper for the picker tray (emoji/label by id). */
export function getLobbyEmote(id: LobbyEmoteId): LobbyEmote | undefined {
  return LOBBY_EMOTES.find((e) => e.id === id);
}
