/**
 * Hidden rotating category bonus for Shiritori Solo.
 *
 * Each day a different category is "active" (animals / foods / places).
 * Players don't see it — when a submitted word matches, they earn a 2× bonus
 * and the category is revealed via animation. No UI changes to the base game.
 */

export type CategoryKey = 'animals' | 'foods' | 'places';

const ANIMALS: ReadonlySet<string> = new Set([
  'ねこ', 'いぬ', 'うさぎ', 'さる', 'とら', 'ねずみ', 'かめ', 'たぬき',
  'きつね', 'うま', 'とり', 'くも', 'へび', 'かえる', 'くじら', 'ひつじ',
  'さい', 'ぞう', 'きりん', 'らいおん', 'とかげ', 'さかな',
]);

const FOODS: ReadonlySet<string> = new Set([
  'りんご', 'にんじん', 'たまご', 'うどん', 'すし', 'てんぷら', 'みかん',
  'とうふ', 'もち', 'みそ', 'やさい', 'こめ', 'さとう', 'のり', 'ごはん',
  'らーめん', 'すいか', 'いちご', 'ももたろう', 'なす', 'きゅうり',
]);

const PLACES: ReadonlySet<string> = new Set([
  'みなと', 'やま', 'かわ', 'しろ', 'うみ', 'まち', 'もり', 'むら',
  'こうえん', 'そら', 'いけ', 'はし', 'しま', 'さと', 'みち', 'ひろば',
  'たに', 'おかやま', 'きょうと', 'とうきょう',
]);

const CATEGORIES: Record<CategoryKey, ReadonlySet<string>> = {
  animals: ANIMALS,
  foods: FOODS,
  places: PLACES,
};

const ROTATION: CategoryKey[] = ['animals', 'foods', 'places'];

/** Derive today's hidden category from a date ISO string (rotates daily). */
export function getHiddenCategory(dateISO: string): CategoryKey {
  const day = new Date(dateISO).getDate();
  return ROTATION[day % ROTATION.length];
}

export interface CategoryBonusResult {
  hit: boolean;
  category: CategoryKey | null;
  /** Score multiplier applied on top of existing pts (2 = double). */
  bonusMultiplier: 2 | 1;
}

/** Check if a hiragana word matches the hidden daily category. */
export function checkCategoryBonus(word: string, dateISO: string): CategoryBonusResult {
  const category = getHiddenCategory(dateISO);
  const hit = CATEGORIES[category].has(word);
  return { hit, category: hit ? category : null, bonusMultiplier: hit ? 2 : 1 };
}
