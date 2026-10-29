/**
 * Pure model for the projector lobby. Every class string here is a WHOLE literal:
 * Tailwind v4 only emits utilities it can see verbatim, so nothing is composed.
 *
 * Sizes are container units: the lobby root is a size container, so the wall
 * renders the same inside a preview frame or a sheet as it does full-screen.
 */

export const CHIP_ACCENTS = [
  'bg-neo-lime text-neo-black border-neo-black',
  'bg-neo-pink text-neo-black border-neo-black',
  'bg-neo-cyan text-neo-black border-neo-black',
  'bg-neo-purple text-neo-cream border-neo-black',
] as const;

/** Deterministic per-name accent, so a student keeps their colour across renders. */
export function chipAccent(name: string, index: number): string {
  const seed = name ? name.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 9973, 7) : index;
  return CHIP_ACCENTS[seed % CHIP_ACCENTS.length];
}

/** Container width (rem) from which the lobby splits into join hero | roster columns; matches `@5xl`. */
export const WIDE_MIN_REM = 64;

/** Back-row code: at least a tenth of the wall's height on every 4:3, 16:9 and 21:9 wall. */
export const HERO_CODE_TEXT = 'text-[min(14cqw,12cqh)] @5xl:text-[min(7.6cqw,14cqh)]';

export const HERO_QR_SIZE = 'size-[min(36cqw,24cqh)] @5xl:size-[min(14cqw,30cqh)]';

export interface RosterTier {
  readonly upTo: number;
  readonly grid: string;
  /** cqw = the roster's own width; cqh = the lobby's height, so a short wall still fits its rows. */
  readonly chip: string;
  readonly scrolls: boolean;
}

export const ROSTER_TIERS: readonly RosterTier[] = [
  {
    upTo: 12,
    grid: 'grid-cols-2 @sm:grid-cols-3 gap-[clamp(0.375rem,1.2cqw,1.25rem)]',
    chip: 'border-[3px] text-[clamp(1rem,min(4.4cqw,4.2cqh),3.5rem)]',
    scrolls: false,
  },
  {
    upTo: 24,
    grid: 'grid-cols-2 @sm:grid-cols-3 @2xl:grid-cols-4 gap-[clamp(0.25rem,0.9cqw,1rem)]',
    chip: 'border-[3px] text-[clamp(0.875rem,min(3.2cqw,3cqh),2.75rem)]',
    scrolls: false,
  },
  {
    upTo: 40,
    grid: 'grid-cols-2 @sm:grid-cols-4 @2xl:grid-cols-5 gap-[clamp(0.25rem,0.7cqw,0.75rem)]',
    chip: 'border-2 text-[clamp(0.8125rem,min(2.5cqw,2.4cqh),2.25rem)]',
    scrolls: false,
  },
  {
    upTo: Number.POSITIVE_INFINITY,
    grid: 'grid-cols-2 @sm:grid-cols-4 @2xl:grid-cols-6 gap-1',
    chip: 'border-2 text-[clamp(0.75rem,min(1.8cqw,1.9cqh),1.75rem)]',
    scrolls: true,
  },
];

/** Monotonic: one more arrival never makes a chip bigger. */
export function rosterTier(count: number): RosterTier {
  return ROSTER_TIERS.find((tier) => count <= tier.upTo) ?? ROSTER_TIERS[ROSTER_TIERS.length - 1];
}

/** One tile per character: never split a code into fewer boxes than it has letters. */
export function codeCharacters(gameCode: string): string[] {
  return Array.from((gameCode || '').toUpperCase());
}

/** One student unlocks Start; the button's `disabled` and its reason line both read this. */
export function canStartProjectorRound(studentCount: number): boolean {
  return studentCount > 0;
}

/** Names present now that were not before. `null` = first paint: a reconnecting wall plays no fanfare. */
export function arrivalsSince(previous: readonly string[] | null, current: readonly string[]): string[] {
  if (previous === null) return [];
  const seen = new Set(previous);
  return current.filter((name) => !seen.has(name));
}

const BURST_WINDOW_MS = 1000;
const BURST_MAX = 30;

export function recordArrivals(times: readonly number[], count: number, now: number): number[] {
  const recent = times.filter((at) => now - at < BURST_WINDOW_MS);
  for (let i = 0; i < count; i++) recent.push(now);
  return recent;
}

/** A whole class pasting the link at once: chips land still instead of 30 pops fighting for frames. */
export function isArrivalBurst(recentArrivals: number, incoming: number): boolean {
  return recentArrivals + incoming > BURST_MAX;
}

interface StartLabelInput {
  starting: boolean;
  canStart: boolean;
  isBoss: boolean;
  /** The teacher switched mode in this lobby, so the launch-time label is stale. */
  switched: boolean;
  isQuiz: boolean;
  startLabelKey: string;
}

export function projectorStartLabel({ starting, canStart, isBoss, switched, isQuiz, startLabelKey }: StartLabelInput): string {
  if (!canStart && !starting) return 'eduLive.lobby.waitingForStudents';
  if (isBoss) return 'eg2Modes.boss.start';
  if (switched) return isQuiz ? 'hostView.startQuiz' : 'hostView.startClassGame';
  return startLabelKey;
}
