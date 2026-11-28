import type { PartyGameId } from '@/lib/holidays/arcade/party/games';

export const PARTY_LOOK = {
  hanukkah: { stripe: 'bg-neo-holiday-blue', bulbs: ['bg-neo-holiday-gold', 'bg-neo-holiday-blue', 'bg-neo-holiday-snow'], mascot: '/holidays/m-hanukkah.webp' },
  christmas: { stripe: 'bg-neo-holiday-red', bulbs: ['bg-neo-holiday-red', 'bg-neo-holiday-pine', 'bg-neo-holiday-gold'], mascot: '/holidays/m-christmas.webp' },
} as const;

export const partyBg = (game: PartyGameId) => `/holidays/arcade/bg-party-${game}.webp`;
