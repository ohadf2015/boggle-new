import type { QuestConditionType, QuestPublicMode } from '@/shared/dailyQuestPool';

export interface QuestAccent {
  bg: string;
  text: string;
  border: string;
  wash: string;
}

export interface QuestArt {
  art: string;
  accent: QuestAccent;
}

const ACCENTS = {
  lime: { bg: 'bg-neo-lime', text: 'text-neo-lime', border: 'border-neo-lime', wash: 'bg-neo-lime/15' },
  yellow: { bg: 'bg-neo-yellow', text: 'text-neo-yellow', border: 'border-neo-yellow', wash: 'bg-neo-yellow/15' },
  cyan: { bg: 'bg-neo-cyan', text: 'text-neo-cyan', border: 'border-neo-cyan', wash: 'bg-neo-cyan/15' },
  orange: { bg: 'bg-neo-orange', text: 'text-neo-orange', border: 'border-neo-orange', wash: 'bg-neo-orange/15' },
  purple: { bg: 'bg-neo-purple', text: 'text-neo-purple', border: 'border-neo-purple', wash: 'bg-neo-purple/15' },
  pink: { bg: 'bg-neo-pink', text: 'text-neo-pink', border: 'border-neo-pink', wash: 'bg-neo-pink/15' },
} satisfies Record<string, QuestAccent>;

const MODE_ART: Record<QuestPublicMode, string> = {
  'word-hunt': 'magnifier',
  'word-wheel': 'wheel',
  'word-tower-daily': 'tower',
  'connections-daily': 'chain',
  multiplayer: 'controller',
  brain: 'brain',
};

const TYPE_ART: Record<QuestConditionType, { art: string; accent: QuestAccent }> = {
  longWord: { art: 'tape', accent: ACCENTS.lime },
  wordsInGame: { art: 'bolt', accent: ACCENTS.yellow },
  towerMetres: { art: 'tower', accent: ACCENTS.cyan },
  towerFloors: { art: 'bricks', accent: ACCENTS.orange },
  puzzlesSolved: { art: 'puzzle', accent: ACCENTS.purple },
  score: { art: 'target', accent: ACCENTS.pink },
  combo: { art: 'fireball', accent: ACCENTS.orange },
  mpWin: { art: 'crown', accent: ACCENTS.yellow },
  beatHuman: { art: 'swords', accent: ACCENTS.pink },
  playMode: { art: 'controller', accent: ACCENTS.cyan },
};

export function getQuestArt({ type, mode }: { type: QuestConditionType; mode?: QuestPublicMode }): QuestArt {
  const byType = TYPE_ART[type] ?? TYPE_ART.playMode;
  const name = (mode && MODE_ART[mode]) || byType.art;
  return { art: `/quests/${name}.webp`, accent: byType.accent };
}
