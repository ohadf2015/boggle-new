import type { VaultGridConfig } from './types';

const HE_LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');

const THEME_BIAS_BAG: Record<string, string[]> = {
  kitchen: ['א', 'ש', 'ב', 'ל', 'ח', 'מ', 'ק', 'ע', 'ד'],
  cold:    ['ק', 'ר', 'פ', 'ז', 'ב', 'ר', 'ד', 'צ', 'נ'],
  soot:    ['א', 'פ', 'ח', 'ש', 'ל', 'מ', 'ר', 'ע', 'ב'],
  memory:  ['ז', 'כ', 'ר', 'ו', 'נ', 'ת', 'א', 'ב', 'ה'],
  final:   ['א', 'ש', 'ג', 'ח', 'ל', 'ת', 'מ', 'ר', 'ב'],
};

const uniqueChars = (words: string[]): string[] => {
  const set = new Set<string>();
  words.forEach((w) => w.split('').forEach((c) => set.add(c)));
  return Array.from(set);
};

const themedFiller = (bias: string | undefined, count: number): string[] => {
  const bag = (bias && THEME_BIAS_BAG[bias]) || HE_LETTERS;
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(bag[Math.floor(Math.random() * bag.length)]);
  return out;
};

export function generateLetters(cfg: VaultGridConfig): string[] {
  const total = cfg.size * cfg.size;

  if (cfg.letterSource === 'forced') {
    if (!cfg.letters || cfg.letters.length !== total) {
      throw new Error(`forced letter count ${cfg.letters?.length ?? 0} must equal size*size = ${total}`);
    }
    return [...cfg.letters];
  }

  const targetWords = cfg.targets.map((t) => t.word);
  const required = uniqueChars(targetWords);

  if (cfg.letterSource === 'pangram') {
    if (required.length > total) {
      throw new Error(`pangram needs ${required.length} unique letters but grid has ${total}`);
    }
    const out = [...required];
    while (out.length < total) out.push(required[Math.floor(Math.random() * required.length)]);
    return shuffle(out);
  }

  // pool
  const filler = themedFiller(cfg.themeBias, total - required.length);
  return shuffle([...required, ...filler]);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
