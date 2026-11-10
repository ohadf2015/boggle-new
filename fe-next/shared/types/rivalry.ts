export const RIVAL_EVENTS = {
  update: 'rivalUpdate',
  flip: 'rivalFlip',
  sync: 'rivalSync',
} as const;

export type RivalAvatar = {
  avatarImage?: string;
  customAvatar?: unknown;
  emoji?: string;
  color?: string;
} | null;

export interface RivalView {
  rivalName: string;
  rivalAvatar: RivalAvatar;
  myScore: number;
  rivalScore: number;
}

export interface RivalUpdatePayload {
  gameSessionId: number | null;
  rival: RivalView | null;
  tookLead?: boolean;
}

export interface RivalFlipPayload {
  gameSessionId: number | null;
  winnerName: string;
  winnerAvatar: RivalAvatar;
}
