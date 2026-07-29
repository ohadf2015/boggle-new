/**
 * Weekly Modifiers — 3 rotating gameplay mutators per week.
 * All players get the same modifiers, seeded by year + week number.
 */

export interface ModifierEffects {
  timerMultiplier?: number;  // 0.5 = half time, 2.0 = double time
  scoreMultiplier?: number;  // 2.0 = double score
  minWordLength?: number;    // override minimum word length
  goldMultiplier?: number;   // 2.0 = double gold
  specialTileMultiplier?: number; // extra special tiles
}

export interface WeeklyModifier {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  effects: ModifierEffects;
}

export const MODIFIER_POOL: WeeklyModifier[] = [
  { id: 'mod-speed-demon', nameKey: 'adventure.weekly.speedDemon.name', descriptionKey: 'adventure.weekly.speedDemon.desc', icon: '⚡', effects: { timerMultiplier: 0.6, scoreMultiplier: 1.5 } },
  { id: 'mod-long-words', nameKey: 'adventure.weekly.longWords.name', descriptionKey: 'adventure.weekly.longWords.desc', icon: '📏', effects: { minWordLength: 4, goldMultiplier: 1.5 } },
  { id: 'mod-gold-rush', nameKey: 'adventure.weekly.goldRush.name', descriptionKey: 'adventure.weekly.goldRush.desc', icon: '💰', effects: { goldMultiplier: 2.0, timerMultiplier: 0.8 } },
  { id: 'mod-ice-age', nameKey: 'adventure.weekly.iceAge.name', descriptionKey: 'adventure.weekly.iceAge.desc', icon: '🧊', effects: { specialTileMultiplier: 2.0, scoreMultiplier: 1.3 } },
  { id: 'mod-marathon', nameKey: 'adventure.weekly.marathon.name', descriptionKey: 'adventure.weekly.marathon.desc', icon: '🏃', effects: { timerMultiplier: 1.5, scoreMultiplier: 0.8 } },
  { id: 'mod-double-or-nothing', nameKey: 'adventure.weekly.doubleOrNothing.name', descriptionKey: 'adventure.weekly.doubleOrNothing.desc', icon: '🎲', effects: { scoreMultiplier: 2.0, timerMultiplier: 0.5 } },
  { id: 'mod-word-smith', nameKey: 'adventure.weekly.wordSmith.name', descriptionKey: 'adventure.weekly.wordSmith.desc', icon: '🔨', effects: { minWordLength: 5, scoreMultiplier: 2.0 } },
  { id: 'mod-treasure-hunter', nameKey: 'adventure.weekly.treasureHunter.name', descriptionKey: 'adventure.weekly.treasureHunter.desc', icon: '🗺️', effects: { goldMultiplier: 1.8, specialTileMultiplier: 1.5 } },
  { id: 'mod-blitz', nameKey: 'adventure.weekly.blitz.name', descriptionKey: 'adventure.weekly.blitz.desc', icon: '💥', effects: { timerMultiplier: 0.4, scoreMultiplier: 3.0 } },
  { id: 'mod-zen-mode', nameKey: 'adventure.weekly.zenMode.name', descriptionKey: 'adventure.weekly.zenMode.desc', icon: '🧘', effects: { timerMultiplier: 2.0, goldMultiplier: 0.5 } },
];

/** Seeded random from year+week */
function seededRandom(year: number, week: number): () => number {
  let h = year * 53 + week;
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 0x100000000;
  };
}

/** Get 3 weekly modifiers for a given year and ISO week number.
 *  Prevents multiple timer-reducing modifiers from stacking
 *  (e.g. Blitz 0.4× + Gold Rush 0.8× = 0.32× would make levels unplayable). */
export function getWeeklyModifiers(year: number, week: number): WeeklyModifier[] {
  const rng = seededRandom(year, week);
  const pool = [...MODIFIER_POOL];
  const selected: WeeklyModifier[] = [];
  let hasTimerReduction = false;

  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    const candidate = pool[idx];
    pool.splice(idx, 1);

    // Skip timer-reducing modifiers if one is already selected
    const reducesTimer = (candidate.effects.timerMultiplier ?? 1) < 1;
    if (reducesTimer && hasTimerReduction) {
      // Try next candidate from remaining pool instead of wasting a slot
      i--;
      continue;
    }

    selected.push(candidate);
    if (reducesTimer) hasTimerReduction = true;
  }

  return selected;
}

export interface ModifiableConfig {
  timerSeconds: number;
  scoreMultiplier: number;
  minWordLength: number;
}

/** Minimum timer after all modifiers — prevents unplayable levels */
const MIN_TIMER_SECONDS = 45;

/** Apply active modifiers to a level config */
export function applyModifiers(config: ModifiableConfig, modifiers: WeeklyModifier[]): ModifiableConfig {
  let { timerSeconds, scoreMultiplier, minWordLength } = config;

  for (const mod of modifiers) {
    const e = mod.effects;
    if (e.timerMultiplier) timerSeconds = Math.round(timerSeconds * e.timerMultiplier);
    if (e.scoreMultiplier) scoreMultiplier *= e.scoreMultiplier;
    if (e.minWordLength) minWordLength = Math.max(minWordLength, e.minWordLength);
  }

  // Floor: never let modifiers reduce timer below minimum playable threshold
  if (timerSeconds > 0) {
    timerSeconds = Math.max(timerSeconds, MIN_TIMER_SECONDS);
  }

  return { timerSeconds, scoreMultiplier, minWordLength };
}
