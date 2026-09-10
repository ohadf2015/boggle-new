/**
 * Pure model for the projector lobby.
 *
 * Kept out of the components so the gating rules ("may the teacher start?",
 * "what does each chip look like?") can be tested without a DOM, and so no
 * component file drifts past 500 lines.
 */

/**
 * Chip accents, written as WHOLE literal class strings on purpose.
 *
 * Tailwind v4 only generates a utility it can see verbatim in the source, so a
 * composed string (`bg-neo-${color}`) silently produces no colour at all. Every
 * class below is therefore complete and never interpolated.
 */
export const CHIP_ACCENTS = [
  'bg-neo-lime text-neo-black border-neo-black',
  'bg-neo-pink text-neo-black border-neo-black',
  'bg-neo-cyan text-neo-black border-neo-black',
  'bg-neo-purple text-neo-cream border-neo-black',
] as const;

/** Deterministic per-name accent, so a student keeps their colour across renders. */
export function chipAccent(name: string, index: number): string {
  const seed = name
    ? name.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 9973, 7)
    : index;
  return CHIP_ACCENTS[seed % CHIP_ACCENTS.length];
}

/**
 * A tiny, deterministic tilt so a wall of chips reads as a scatter rather than
 * a spreadsheet. Bounded to ±3.5° — enough for personality, never enough to
 * make a name hard to read from the back row.
 */
export function chipTilt(name: string, index: number): number {
  const seed = name ? name.charCodeAt(0) + name.length * 7 + index : index;
  return ((seed % 7) - 3) * 1.15;
}

export interface RosterDensityTier {
  /** Largest class size this tier still covers. */
  readonly upTo: number;
  /** Whole literal chip classes: internal gap, border weight, padding, both font steps. */
  readonly chip: string;
  /** Whole literal gap class for the chip list itself. */
  readonly gap: string;
}

/**
 * How big a name chip is, given how many are on the wall.
 *
 * A real class is 25–35 students and NOBODY scrolls a projector. At one fixed
 * chip size the roster ran out of wall somewhere around the eighteenth arrival
 * and every student after that popped in below the fold — the spring fired, the
 * count ticked, and the person who just typed the code never saw their name. A
 * silent no-op with an animation on it (recurring pitfall class 4).
 *
 * So the chip steps DOWN as the room fills. The arithmetic the tiers are cut
 * for, on a 1920×1080 projector where the roster owns roughly 550px of height:
 *
 *   - densest tier, 0.98vw ≈ 19px type → chip ≈ 34px tall, ≈ 165px wide
 *   - usable row ≈ 1824px → ~11 chips per row → 32 students = 3 rows ≈ 120px
 *
 * i.e. a full class lands with room to spare, and a small group still gets the
 * big loud chip that makes arriving feel like something. `overflow-y-auto`
 * stays on the list as a last resort for a room far past a class, but it is no
 * longer what a normal classroom hits.
 *
 * Every class below is a WHOLE literal string. Tailwind v4 only emits a utility
 * it can see verbatim, so a composed `text-[${size}vw]` renders unstyled — the
 * same rule that shapes `CHIP_ACCENTS` above.
 */
export const ROSTER_DENSITY_TIERS: readonly RosterDensityTier[] = [
  {
    upTo: 8,
    chip: 'gap-[0.6vw] border-4 px-[1.3vw] py-[0.6vw] text-[4.2vw] md:text-[2.2vw]',
    gap: 'gap-[1.1vw]',
  },
  {
    upTo: 16,
    chip: 'gap-[0.5vw] border-4 px-[1.1vw] py-[0.5vw] text-[3.6vw] md:text-[1.7vw]',
    gap: 'gap-[0.9vw]',
  },
  {
    upTo: 26,
    chip: 'gap-[0.4vw] border-[3px] px-[0.9vw] py-[0.38vw] text-[3vw] md:text-[1.28vw]',
    gap: 'gap-[0.65vw]',
  },
  {
    upTo: Number.POSITIVE_INFINITY,
    chip: 'gap-[0.35vw] border-[3px] px-[0.7vw] py-[0.28vw] text-[2.5vw] md:text-[0.98vw]',
    gap: 'gap-[0.45vw]',
  },
] as const;

/** The tier a room of `count` students gets. Monotonic: adding a student never enlarges a chip. */
export function rosterDensity(count: number): RosterDensityTier {
  return (
    ROSTER_DENSITY_TIERS.find((tier) => count <= tier.upTo) ??
    ROSTER_DENSITY_TIERS[ROSTER_DENSITY_TIERS.length - 1]
  );
}

/** First glyph of a display name, for the chip's initial tile. */
export function chipInitial(name: string): string {
  const trimmed = (name || '').trim();
  return trimmed ? Array.from(trimmed)[0].toUpperCase() : '?';
}

/** One tile per character — never split a code into fewer boxes than it has letters. */
export function codeCharacters(gameCode: string): string[] {
  return Array.from((gameCode || '').toUpperCase());
}

/**
 * The teacher may start once ONE student is in the room.
 *
 * The rule lives here rather than inline so the button's `disabled` and the
 * reason line under it can never disagree — a dead control with no stated
 * reason is the silent-failure shape this repo keeps shipping (pitfall 4).
 */
export function canStartProjectorRound(studentCount: number): boolean {
  return studentCount > 0;
}
