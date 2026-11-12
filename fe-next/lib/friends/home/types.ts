import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { FriendPresence } from '@/shared/types/friends';

export interface CrewPerson {
  userId: string;
  /** Null when the player has no public name; shown as a generic label. */
  name: string | null;
  avatarImage: string | null;
  customAvatar: CustomAvatarConfig | null;
  lastSeenAt: string | null;
  /** My wins against them. */
  wins: number;
  /** Their wins against me. */
  losses: number;
}

export interface CrewRequest {
  requestId: string;
  userId: string;
  name: string | null;
  avatarImage: string | null;
  customAvatar: CustomAvatarConfig | null;
}

export interface FriendsHomeData {
  friends: CrewPerson[];
  friendCount: number;
  incoming: { count: number; first: CrewRequest[] };
  suggestions: CrewPerson[];
  canAddFriends: boolean;
  /** Room presence for the friends shown; offline/unknown friends are left out. */
  presence: FriendPresence[];
}

export const EMPTY_FRIENDS_HOME: FriendsHomeData = {
  friends: [],
  friendCount: 0,
  incoming: { count: 0, first: [] },
  suggestions: [],
  canAddFriends: false,
  presence: [],
};
