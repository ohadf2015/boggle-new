export const CEFR_LEVELS = ['A1', 'A2', 'B1'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

const LISTS: Record<CefrLevel, string[]> = {
  A1: [
    'cat', 'dog', 'pen', 'run', 'open', 'ten', 'red', 'book', 'desk', 'map', 'sun', 'hat',
  ],
  A2: [
    'school', 'train', 'friend', 'family', 'people', 'water', 'city', 'music', 'always', 'because', 'weather', 'hungry',
  ],
  B1: [
    'problem', 'opinion', 'discuss', 'improve', 'decision', 'however', 'suggest', 'reason', 'result', 'important', 'although', 'environment',
  ],
};

const PRACTICE_MODE: Record<CefrLevel, 'warmup' | 'spelling' | 'blitz'> = {
  A1: 'warmup',
  A2: 'spelling',
  B1: 'blitz',
};

/** 4x4 boards. Targets are words that `findWordOnBoard` can actually trace. */
const BOARDS: Record<CefrLevel, { letters: string[]; targets: string[] }> = {
  A1: {
    letters: [
      'C', 'A', 'T', 'S',
      'O', 'P', 'E', 'N',
      'R', 'U', 'N', 'I',
      'D', 'O', 'G', 'Y',
    ],
    targets: ['CAT', 'CATS', 'PEN', 'OPEN', 'RUN', 'DOG', 'TEN', 'CAP'],
  },
  A2: {
    letters: [
      'S', 'C', 'H', 'O',
      'E', 'P', 'O', 'L',
      'T', 'R', 'A', 'I',
      'F', 'D', 'Y', 'N',
    ],
    targets: ['SCHOOL', 'TRAIN', 'RAIN', 'LORE'],
  },
  B1: {
    letters: [
      'P', 'R', 'O', 'B',
      'I', 'E', 'L', 'A',
      'M', 'D', 'E', 'S',
      'H', 'O', 'W', 'N',
    ],
    targets: ['PROBLEM', 'IDEA', 'HOW', 'IDLE'],
  },
};

const SIZE = 4;

export function cefrList(level: CefrLevel): string[] {
  return LISTS[level];
}

export function demoBoard(level: CefrLevel): { letters: string[]; targets: string[] } {
  return BOARDS[level];
}

export function practiceHref(level: CefrLevel, locale: string): string {
  return `/${locale}/education/classroom-game?cefr=${level}&mode=${PRACTICE_MODE[level]}`;
}

export function isAdjacent(a: number, b: number): boolean {
  const ar = Math.floor(a / SIZE);
  const ac = a % SIZE;
  const br = Math.floor(b / SIZE);
  const bc = b % SIZE;
  const dr = Math.abs(ar - br);
  const dc = Math.abs(ac - bc);
  if (dr === 0 && dc === 0) return false;
  return dr <= 1 && dc <= 1;
}

export function wordFromPath(letters: string[], path: number[]): string {
  return path.map((i) => letters[i]).join('');
}

export function findWordOnBoard(board: string[], word: string): number[] | null {
  const w = word.toUpperCase();
  if (!w) return null;

  const dfs = (i: number, pos: number, used: number[]): number[] | null => {
    if (pos === w.length) return used;
    for (let ni = 0; ni < board.length; ni++) {
      if (used.includes(ni) || !isAdjacent(i, ni) || board[ni] !== w[pos]) continue;
      const found = dfs(ni, pos + 1, [...used, ni]);
      if (found) return found;
    }
    return null;
  };

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== w[0]) continue;
    const found = dfs(i, 1, [i]);
    if (found) return found;
  }
  return null;
}

export function isTargetWord(level: CefrLevel, word: string): boolean {
  return demoBoard(level).targets.includes(word.toUpperCase());
}

export type PlayableCopy = {
  title: string;
  intro: string;
  start: string;
  submit: string;
  clear: string;
  found: string;
  practice: string;
  listLabel: string;
  playThis: string;
};

const PLAYABLE_COPY: Record<string, PlayableCopy> = {
  en: {
    title: 'Try a 60-second ESL round',
    intro:
      'Pick a CEFR list, then join adjacent letters on the board. This is a real round — the same motion as the class game. Use the list in class when you are done.',
    start: 'Start the round',
    submit: 'Submit word',
    clear: 'Clear path',
    found: 'Found',
    practice: 'Run this list with the class',
    listLabel: 'Lesson list',
    playThis: 'Play this list',
  },
  es: {
    title: 'Prueba una ronda ESL de 60 segundos',
    intro:
      'Elige una lista MCER y une letras vecinas en el tablero. Es una ronda de verdad, el mismo gesto que el juego de clase. Cuando termines, úsala con el grupo.',
    start: 'Empezar la ronda',
    submit: 'Enviar palabra',
    clear: 'Borrar trazo',
    found: 'Encontradas',
    practice: 'Usar esta lista con la clase',
    listLabel: 'Lista de la lección',
    playThis: 'Jugar esta lista',
  },
  he: {
    title: 'נסו סיבוב ESL של 60 שניות',
    intro:
      'בוחרים רשימת CEFR ומחברים אותיות סמוכות על הלוח. זה סיבוב אמיתי — אותה תנועה כמו במשחק הכיתה. בסוף מריצים את הרשימה עם הכיתה.',
    start: 'התחילו את הסיבוב',
    submit: 'שלחו מילה',
    clear: 'נקו מסלול',
    found: 'נמצאו',
    practice: 'הריצו את הרשימה עם הכיתה',
    listLabel: 'רשימת השיעור',
    playThis: 'שחקו את הרשימה הזאת',
  },
  sv: {
    title: 'Testa en ESL-runda på 60 sekunder',
    intro:
      'Välj en CEFR-lista och koppla ihop angränsande bokstäver. Det är en riktig runda — samma rörelse som klasspelet. Kör listan med klassen efteråt.',
    start: 'Starta rundan',
    submit: 'Skicka ord',
    clear: 'Rensa spår',
    found: 'Hittade',
    practice: 'Kör listan med klassen',
    listLabel: 'Lektionslista',
    playThis: 'Spela den här listan',
  },
  ja: {
    title: '60秒のESLラウンドを試す',
    intro:
      'CEFRリストを選び、隣り合う文字をつなぎます。授業のゲームと同じ動きの本番ラウンドです。終わったらこのリストで授業できます。',
    start: 'ラウンドを始める',
    submit: '単語を送る',
    clear: 'パスを消す',
    found: '見つけた語',
    practice: 'このリストで授業する',
    listLabel: '授業のリスト',
    playThis: 'このリストで遊ぶ',
  },
  ru: {
    title: 'Попробуйте 60-секундный ESL-раунд',
    intro:
      'Выберите список CEFR и соедините соседние буквы. Это настоящий раунд — то же движение, что в классной игре. Потом запустите список с классом.',
    start: 'Начать раунд',
    submit: 'Отправить слово',
    clear: 'Сбросить путь',
    found: 'Найдено',
    practice: 'Запустить список с классом',
    listLabel: 'Список урока',
    playThis: 'Играть этот список',
  },
};

export function playableCopy(locale: string): PlayableCopy {
  return PLAYABLE_COPY[locale] ?? PLAYABLE_COPY.en;
}
