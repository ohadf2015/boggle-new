import type { AbilityId } from './abilities';

export type UpgradeId =
  // Active abilities (also valid AbilityId)
  | 'block'
  | 'steal'
  | 'peek'
  | 'jam'
  | 'twin_spell'
  // Passives
  | 'vowel_surge'
  | 'long_word_rage'
  | 'critical_spell'
  | 'rare_treasure'
  | 'heal_on_word'
  | 'word_shield'
  | 'golden_start';

export type UpgradeKind = 'ability' | 'passive';

export interface UpgradeDef {
  id: UpgradeId;
  kind: UpgradeKind;
  label: string;
  labelHe: string;
  description: string;
  descriptionHe: string;
  accent: number;
}

export const UPGRADE_DEFS: Record<UpgradeId, UpgradeDef> = {
  block: {
    id: 'block',
    kind: 'ability',
    label: 'BLOCK',
    labelHe: 'חסום',
    description: 'Tap a bot-targeted tile to deny it (no compose). CD 2.',
    descriptionHe: 'הקש על אריח שהבוט מסמן וחסום אותו (ללא שימוש). זמן המתנה 2.',
    accent: 0xff77cc,
  },
  steal: {
    id: 'steal',
    kind: 'ability',
    label: 'STEAL',
    labelHe: 'גנוב',
    description: 'Tap a bot-locked tile to free it and add to your word. CD 3.',
    descriptionHe: 'הקש על אריח נעול ושחרר אותו אל המילה שלך. זמן המתנה 3.',
    accent: 0xbfff00,
  },
  peek: {
    id: 'peek',
    kind: 'ability',
    label: 'PEEK',
    labelHe: 'הצץ',
    description: "Reveal the bot's full plan briefly. CD 3.",
    descriptionHe: 'גלה את התוכנית של הבוט לזמן קצר. זמן המתנה 3.',
    accent: 0x00ffff,
  },
  jam: {
    id: 'jam',
    kind: 'ability',
    label: 'JAM',
    labelHe: 'שבש',
    description: "Pause the bot's reveal for 5 sec. CD 4.",
    descriptionHe: 'עצור את הבוט למשך 5 שניות. זמן המתנה 4.',
    accent: 0xffe135,
  },
  twin_spell: {
    id: 'twin_spell',
    kind: 'ability',
    label: 'TWIN',
    labelHe: 'תאומה',
    description: 'Cast a second word at 50% damage. CD 4.',
    descriptionHe: 'כשף מילה שנייה ב־50% נזק. זמן המתנה 4.',
    accent: 0x8b5cf6,
  },
  vowel_surge: {
    id: 'vowel_surge',
    kind: 'passive',
    label: 'VOWEL SURGE',
    labelHe: 'גל תנועות',
    description: 'Words with 3+ vowels deal +50%.',
    descriptionHe: 'מילים עם 3 תנועות או יותר מכפילות נזק ב־1.5.',
    accent: 0x00ffff,
  },
  long_word_rage: {
    id: 'long_word_rage',
    kind: 'passive',
    label: 'LONG-WORD RAGE',
    labelHe: 'זעם של מילה ארוכה',
    description: 'Words ≥6 letters deal +50%.',
    descriptionHe: 'מילים באורך 6 ומעלה מכפילות נזק ב־1.5.',
    accent: 0xff1493,
  },
  critical_spell: {
    id: 'critical_spell',
    kind: 'passive',
    label: 'CRITICAL SPELL',
    labelHe: 'כשף קריטי',
    description: '25% chance any word crits ×2.',
    descriptionHe: '25% סיכוי לקריטי ×2 בכל מילה.',
    accent: 0xffe135,
  },
  rare_treasure: {
    id: 'rare_treasure',
    kind: 'passive',
    label: 'RARE TREASURE',
    labelHe: 'אוצר נדיר',
    description: 'Rare letters deal ×3.',
    descriptionHe: 'אותיות נדירות מכפילות נזק ב־3.',
    accent: 0x8b5cf6,
  },
  heal_on_word: {
    id: 'heal_on_word',
    kind: 'passive',
    label: 'HEAL ON WORD',
    labelHe: 'ריפוי במילה',
    description: 'Heal +1 HP per word cast.',
    descriptionHe: 'התרפא ב־1 בכל מילה שאתה מכשף.',
    accent: 0x4ade80,
  },
  word_shield: {
    id: 'word_shield',
    kind: 'passive',
    label: 'WORD SHIELD',
    labelHe: 'מגן מילה',
    description: "First word per fight blocks bot's next attack.",
    descriptionHe: 'המילה הראשונה בקרב חוסמת את ההתקפה הבאה של הבוט.',
    accent: 0xbfff00,
  },
  golden_start: {
    id: 'golden_start',
    kind: 'passive',
    label: 'GOLDEN START',
    labelHe: 'התחלה זהובה',
    description: '+2 extra gold tiles each fight.',
    descriptionHe: '+2 אריחי זהב נוספים בכל קרב.',
    accent: 0xffe135,
  },
};

const ALL_UPGRADES = Object.keys(UPGRADE_DEFS) as UpgradeId[];

/** Pick N random upgrades the player doesn't already have. */
export function pickRandomUpgradeChoices(
  currentlyEquipped: UpgradeId[],
  count: number,
): UpgradeId[] {
  const owned = new Set(currentlyEquipped);
  const available = ALL_UPGRADES.filter((id) => !owned.has(id));
  // Shuffle (Fisher-Yates) and take first count
  const arr = [...available];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}

export function isAbilityUpgrade(id: UpgradeId): id is AbilityId {
  return UPGRADE_DEFS[id].kind === 'ability';
}
