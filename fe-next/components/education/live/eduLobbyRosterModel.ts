export interface LobbyRosterTier {
  /** Largest room this tier still covers. */
  readonly upTo: number;
  /** Whole literal strings: Tailwind v4 emits only utilities it can see verbatim. */
  readonly grid: string;
  readonly chip: string;
  readonly avatar: string;
  readonly scrolls: boolean;
}

/** Nobody scrolls a projector, so chips shrink as the room fills; a real class (25-40) still fits the wall. */
export const LOBBY_ROSTER_TIERS: readonly LobbyRosterTier[] = [
  {
    upTo: 12,
    grid: 'grid-cols-2 sm:grid-cols-3 gap-2 md:gap-[0.9vw]',
    chip: 'border-[3px] py-1 pe-3 ps-1 text-lg md:py-[0.45vw] md:pe-[1vw] md:text-[min(1.9vw,3.6vh)]',
    avatar: 'size-10 md:size-[min(3.8vw,7vh)]',
    scrolls: false,
  },
  {
    upTo: 24,
    grid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 md:gap-[0.55vw]',
    chip: 'border-[3px] py-0.5 pe-2.5 ps-0.5 text-base md:py-[0.32vw] md:pe-[0.8vw] md:text-[min(1.5vw,2.9vh)]',
    avatar: 'size-8 md:size-[min(3vw,5.6vh)]',
    scrolls: false,
  },
  {
    upTo: 40,
    grid: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1 md:gap-[0.5vw]',
    chip: 'border-2 py-0.5 pe-2 ps-0.5 text-sm md:py-[0.3vw] md:pe-[0.65vw] md:text-[min(1.35vw,2.6vh)]',
    avatar: 'size-6 md:size-[min(2.6vw,4.8vh)]',
    scrolls: false,
  },
  {
    upTo: Number.POSITIVE_INFINITY,
    grid: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1 md:gap-[0.35vw]',
    chip: 'border-2 py-0.5 pe-2 ps-0.5 text-sm md:py-[0.12vw] md:pe-[0.45vw] md:text-[min(0.85vw,1.8vh)]',
    avatar: 'size-6 md:size-[min(1.5vw,3vh)]',
    scrolls: true,
  },
];

/** Monotonic: one more arrival never makes a chip bigger. */
export function lobbyRosterLayout(count: number): LobbyRosterTier {
  return LOBBY_ROSTER_TIERS.find((tier) => count <= tier.upTo) ?? LOBBY_ROSTER_TIERS[LOBBY_ROSTER_TIERS.length - 1];
}
