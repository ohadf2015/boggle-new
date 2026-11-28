export const PARTY_GAMES = ['catch', 'splat', 'dash'] as const;
export type PartyGameId = (typeof PARTY_GAMES)[number];
export const MAX_PARTY = 8;
export const PARTY_COLORS = ['neo-lime', 'neo-pink', 'neo-cyan', 'neo-orange', 'neo-purple', 'neo-holiday-snow', 'neo-holiday-red', 'neo-cream'] as const;

export const isPartyGame = (v: unknown): v is PartyGameId => typeof v === 'string' && (PARTY_GAMES as readonly string[]).includes(v);
