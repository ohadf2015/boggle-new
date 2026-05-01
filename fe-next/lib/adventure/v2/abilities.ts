export type AbilityId =
  | 'block'
  | 'steal'
  | 'peek'
  | 'jam'
  | 'twin_spell';

export interface AbilityState {
  id: AbilityId;
  cooldownRemaining: number; // turns until usable; 0 = ready
  maxCooldown: number;
}

export interface AbilityDef {
  id: AbilityId;
  label: string;
  labelHe: string;
  description: string;
  descriptionHe: string;
  maxCooldown: number;
  /** Color for the ability button (Neo-Brutalist palette). */
  accent: number;
}

export const ABILITY_DEFS: Record<AbilityId, AbilityDef> = {
  block: {
    id: 'block',
    label: 'BLOCK',
    labelHe: 'חסום',
    description: "Tap a tile the bot is targeting to deny it (you don't use it).",
    descriptionHe: 'הקש על אריח שהבוט מסמן כדי לחסום אותו (אינך משתמש בו).',
    maxCooldown: 2,
    accent: 0xff77cc,
  },
  steal: {
    id: 'steal',
    label: 'STEAL',
    labelHe: 'גנוב',
    description: 'Tap a bot-locked tile to instantly free it and add to your word.',
    descriptionHe: 'הקש על אריח נעול כדי לשחרר אותו ולהוסיף למילה שלך.',
    maxCooldown: 3,
    accent: 0xbfff00,
  },
  peek: {
    id: 'peek',
    label: 'PEEK',
    labelHe: 'הצץ',
    description: "Reveal the bot's full planned word for 3 seconds.",
    descriptionHe: 'גלה את המילה המתוכננת של הבוט למשך 3 שניות.',
    maxCooldown: 3,
    accent: 0x00ffff,
  },
  jam: {
    id: 'jam',
    label: 'JAM',
    labelHe: 'שבש',
    description: "Freeze the bot's reveal progress for 5 seconds.",
    descriptionHe: 'הקפא את התקדמות הבוט למשך 5 שניות.',
    maxCooldown: 4,
    accent: 0xffe135,
  },
  twin_spell: {
    id: 'twin_spell',
    label: 'TWIN',
    labelHe: 'תאומה',
    description: 'Cast a second word this turn at 50% damage.',
    descriptionHe: 'כשף מילה שנייה בתור זה ב־50% נזק.',
    maxCooldown: 4,
    accent: 0x8b5cf6,
  },
};

export function isAbilityReady(state: AbilityState): boolean {
  return state.cooldownRemaining <= 0;
}

export function tickAbilityCooldowns(states: AbilityState[]): AbilityState[] {
  return states.map((s) =>
    s.cooldownRemaining > 0
      ? { ...s, cooldownRemaining: s.cooldownRemaining - 1 }
      : s,
  );
}

export function consumeAbility(
  states: AbilityState[],
  id: AbilityId,
): AbilityState[] {
  return states.map((s) =>
    s.id === id
      ? { ...s, cooldownRemaining: s.maxCooldown }
      : s,
  );
}
