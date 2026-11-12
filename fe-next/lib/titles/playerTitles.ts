import { LEVEL_TITLES, PRESTIGE_CONFIG, getTitleForLevel } from '@/backend/modules/xpManager';
import { ACHIEVEMENT_TITLE_REWARDS } from '@/backend/modules/achievements/progressionAchievements';

export type TitleSource = 'level' | 'prestige' | 'achievement';

export interface UnlockedTitle {
  id: string;
  source: TitleSource;
}

export interface TitleContext {
  level?: number | null;
  prestigeLevel?: number | null;
  achievementKeys?: readonly string[] | null;
}

const LEVEL_TITLE_IDS = new Set(Object.values(LEVEL_TITLES).filter((v): v is string => !!v));

export function titleLabelKey(id: string): string {
  return LEVEL_TITLE_IDS.has(id) ? `landing.home.titles.${id}` : `progression.titles.${id}`;
}

export function getUnlockedTitles({ level, prestigeLevel, achievementKeys }: TitleContext): UnlockedTitle[] {
  const out: UnlockedTitle[] = [];
  const lvl = level ?? 1;
  for (const [min, id] of Object.entries(LEVEL_TITLES)) {
    if (id && lvl >= Number(min)) out.push({ id, source: 'level' });
  }
  for (let p = 1; p <= (prestigeLevel ?? 0); p++) {
    const id = PRESTIGE_CONFIG.TITLES[p];
    if (id) out.push({ id, source: 'prestige' });
  }
  const held = new Set(achievementKeys ?? []);
  for (const [achievement, id] of Object.entries(ACHIEVEMENT_TITLE_REWARDS)) {
    if (held.has(achievement)) out.push({ id, source: 'achievement' });
  }
  return out;
}

export function isTitleUnlocked(id: string, ctx: TitleContext): boolean {
  return getUnlockedTitles(ctx).some(t => t.id === id);
}

export function resolveDisplayTitle({ chosenTitle, level }: { chosenTitle?: string | null; level?: number | null }): string | null {
  if (chosenTitle) return chosenTitle;
  return getTitleForLevel(level ?? 1);
}
