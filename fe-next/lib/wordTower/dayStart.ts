/**
 * Word Tower — "today's climb" baseline (pure).
 *
 * The tower PERSISTS across UTC days, so `game.heightM` is a lifetime number.
 * Submitting it as the daily score made the daily board a lifetime board wearing
 * a daily label: on 2026-08-19..25 two returning players re-posted an unchanged
 * height on a later day (334 -> 334, 99 -> 99) having placed nothing, while a
 * newcomer's first 3-letter word (2m) was ranked against 453m. Nothing a
 * returning player did today moved their number, and nothing a new player did
 * could ever catch up.
 *
 * Today's score is therefore the DELTA — metres climbed since the day's baseline
 * — so every UTC day starts everyone at zero and one word is visible progress.
 * The lifetime tower is unaffected; it keeps growing (see `total_floors_built`).
 */

export interface DayStart {
  /** UTC date key this baseline belongs to. */
  dayKey: string;
  /** Tower height (metres) at the moment today's climb began. */
  startHeightM: number;
  /** Floor count at the moment today's climb began. */
  startFloors: number;
  /**
   * Frozen once the player places a floor today.
   *
   * Until it is locked the baseline is freely re-stampable, and that is what
   * makes the late DB swap safe: `WordTowerGame` paints from the local session
   * first and only then may replace it with a taller server `current_state`
   * (localStorage vs DB, DB resolving later — recurring-pitfalls Class 1). An
   * unlocked baseline follows that swap up, so the climb stays 0 instead of
   * crediting the player with metres they built on another device.
   */
  locked: boolean;
}

/** Per-UTC-day localStorage slot for the baseline. */
export function dayStartKey(dateKey: string): string {
  return `wt-day-start-${dateKey}`;
}

/**
 * Resolve the baseline for `todayKey` against the tower's current height.
 *
 * Absence of a stored entry — which is every existing save blob, none of which
 * carry a baseline — means "today starts here", so the missing field defaults to
 * the correct behaviour and needs no migration.
 */
export function resolveDayStart(
  stored: DayStart | null,
  todayKey: string,
  currentHeightM: number,
  currentFloors: number,
): DayStart {
  if (!stored || stored.dayKey !== todayKey) {
    return { dayKey: todayKey, startHeightM: currentHeightM, startFloors: currentFloors, locked: false };
  }
  if (stored.locked) return stored;
  return { ...stored, startHeightM: currentHeightM, startFloors: currentFloors };
}

/** Freeze the baseline where it stands — called when the first floor lands today. */
export function lockDayStart(ds: DayStart): DayStart {
  return { ...ds, locked: true };
}

/**
 * Metres climbed today. Whole metres so it matches the floored score the server
 * stores, and clamped at 0 so a wreck that shortens the tower below the baseline
 * reads as "no climb yet" rather than a negative score.
 */
export function todayClimbM(heightM: number, startHeightM: number): number {
  return Math.max(0, Math.floor(heightM) - Math.floor(startHeightM));
}

/** Floors built today. Same baseline, same clamp, so it agrees with the climb. */
export function todayFloors(floors: number, startFloors: number): number {
  return Math.max(0, floors - startFloors);
}

export function serializeDayStart(ds: DayStart): string {
  return JSON.stringify(ds);
}

/** Tolerant parse — malformed or absent storage must never break a climb. */
export function parseDayStart(raw: string | null): DayStart | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<DayStart>;
    if (typeof v?.dayKey !== 'string' || typeof v?.startHeightM !== 'number') return null;
    return {
      dayKey: v.dayKey,
      startHeightM: v.startHeightM,
      startFloors: typeof v.startFloors === 'number' ? v.startFloors : 0,
      locked: v.locked === true,
    };
  } catch {
    return null;
  }
}
