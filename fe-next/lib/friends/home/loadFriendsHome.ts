import { computeSocialTier, resolveSocialCapabilities, type SocialCapabilities } from '@/lib/families/socialPolicy';
import { isGrandfatheredCreatedAt } from '@/lib/families/grandfather';
import { publicNameOrNull } from '@/lib/names/publicName';
import type { H2HRow } from '@/lib/rivals/pickers';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { FriendPresence } from '@/shared/types/friends';
import { sortCrew, SUGGEST_BELOW } from './crewModel';
import type { CrewPerson, CrewRequest, FriendsHomeData } from './types';

export const FRIENDS_SHOWN = 6;
export const REQUESTS_SHOWN = 2;
export const SUGGESTIONS_SHOWN = 4;
const SUGGEST_DAYS = 30;

export interface FriendRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string | null;
}

export interface HomeProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_config: unknown;
  avatar_image: string | null;
  last_seen_at: string | null;
  is_test_account: boolean | null;
  birth_year: number | null;
  social_features_override: unknown;
  created_at: string | null;
}

export interface FriendsHomeDeps {
  now: () => number;
  myProfile: (me: string) => Promise<{ birth_year: number | null; social_features_override: unknown; created_at: string | null } | null>;
  friendRows: (me: string) => Promise<FriendRow[]>;
  /** Pending requests sent to me, newest first. */
  incomingRequests: (me: string) => Promise<FriendRow[]>;
  h2hRows: (me: string) => Promise<H2HRow[]>;
  profiles: (ids: string[]) => Promise<HomeProfileRow[]>;
  presence: (ids: string[]) => FriendPresence[];
}

type AgeRow = { birth_year: number | null; social_features_override: unknown; created_at: string | null } | null;

function capabilities(row: AgeRow, now: number): SocialCapabilities {
  const computed = computeSocialTier(row?.birth_year ?? null, new Date(now).getUTCFullYear());
  const tier = computed === 'unknown' && isGrandfatheredCreatedAt(row?.created_at ?? null) ? 'adult' : computed;
  return resolveSocialCapabilities(tier, (row?.social_features_override as Partial<SocialCapabilities> | null) ?? null);
}

function record(h2h: Map<string, H2HRow>, me: string, other: string): { wins: number; losses: number } {
  const row = h2h.get(other);
  if (!row) return { wins: 0, losses: 0 };
  const iAmP1 = row.player1_id === me;
  return {
    wins: (iAmP1 ? row.player1_wins : row.player2_wins) ?? 0,
    losses: (iAmP1 ? row.player2_wins : row.player1_wins) ?? 0,
  };
}

const avatarOf = (p: HomeProfileRow) => ({
  avatarImage: p.avatar_image ?? null,
  customAvatar: (p.avatar_config as CustomAvatarConfig | null) ?? null,
});

/** The signed-in player's crew for the home card: friends, incoming requests, and recent opponents to add. */
export async function loadFriendsHome(
  deps: FriendsHomeDeps,
  me: string,
  opts: { suggestions?: boolean } = {},
): Promise<FriendsHomeData> {
  const now = deps.now();
  const [mine, rows, incomingRows, h2hList] = await Promise.all([
    deps.myProfile(me),
    deps.friendRows(me),
    deps.incomingRequests(me),
    deps.h2hRows(me),
  ]);
  const canAddFriends = capabilities(mine, now).friendManagement;

  const other = (r: FriendRow) => (r.user_id === me ? r.friend_id : r.user_id);
  const friendIds = rows.filter((r) => r.status === 'accepted').map(other);
  const known = new Set([...rows, ...incomingRows].map(other));

  const h2h = new Map<string, H2HRow>();
  for (const row of h2hList) {
    const opp = row.player1_id === me ? row.player2_id : row.player1_id;
    if (opp && opp !== me && !h2h.has(opp)) h2h.set(opp, row);
  }

  const wantSuggestions = canAddFriends && (opts.suggestions || friendIds.length < SUGGEST_BELOW);
  const since = now - SUGGEST_DAYS * 86_400_000;
  const candidateIds = wantSuggestions
    ? [...h2h.entries()]
        .filter(([id, row]) => !known.has(id) && (Date.parse(row.last_game_at ?? '') || 0) >= since)
        .map(([id]) => id)
    : [];
  const requestIds = incomingRows.slice(0, REQUESTS_SHOWN).map((r) => r.user_id);

  const read = (ids: string[]) => (ids.length ? deps.profiles(ids) : Promise.resolve([]));
  const groups = await Promise.all([read(friendIds), read(requestIds), read(candidateIds)]);
  const byId = new Map(groups.flat().map((p) => [p.id, p]));

  const allFriends: CrewPerson[] = friendIds.flatMap((id) => {
    const p = byId.get(id);
    if (!p) return [];
    const name = publicNameOrNull(p.display_name) ?? publicNameOrNull(p.username);
    return [{ userId: id, name, ...avatarOf(p), lastSeenAt: p.last_seen_at, ...record(h2h, me, id) }];
  });
  const presenceById = new Map(deps.presence(allFriends.map((f) => f.userId)).map((p) => [p.userId, p]));
  const friends = sortCrew(allFriends, presenceById, now).slice(0, FRIENDS_SHOWN);
  const presence = friends.flatMap((f) => {
    const p = presenceById.get(f.userId);
    return p && p.status ? [p] : [];
  });

  const first: CrewRequest[] = requestIds.flatMap((id) => {
    const p = byId.get(id);
    const req = incomingRows.find((r) => r.user_id === id);
    if (!p || !req) return [];
    const name = publicNameOrNull(p.display_name) ?? publicNameOrNull(p.username);
    return [{ requestId: req.id, userId: id, name, ...avatarOf(p) }];
  });

  const suggestions: CrewPerson[] = candidateIds
    .flatMap((id) => {
      const p = byId.get(id);
      if (!p || p.is_test_account || !capabilities(p, now).friendManagement) return [];
      const name = publicNameOrNull(p.display_name) ?? publicNameOrNull(p.username);
      if (!name) return [];
      return [{ userId: id, name, ...avatarOf(p), lastSeenAt: p.last_seen_at, ...record(h2h, me, id) }];
    })
    .slice(0, SUGGESTIONS_SHOWN);

  return {
    friends,
    friendCount: friendIds.length,
    incoming: { count: incomingRows.length, first },
    suggestions,
    canAddFriends,
    presence,
  };
}
