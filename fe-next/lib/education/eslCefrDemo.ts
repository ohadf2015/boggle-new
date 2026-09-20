export const CEFR_LEVELS = ['A1', 'A2', 'B1'] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/**
 * The starter wordlists with their glosses. `en` is a simple learner
 * definition, `es` the Spanish gloss — both written natively, because the
 * proven audience of /education/esl-word-games is Spanish-speaking teachers
 * of English (GSC 28d). Other locales fall back to the English definition.
 */
export interface CefrGloss {
  word: string;
  en: string;
  es: string;
}

const GLOSSES: Record<CefrLevel, CefrGloss[]> = {
  A1: [
    { word: 'cat', en: 'a small pet that says meow', es: 'el gato' },
    { word: 'dog', en: 'a loyal pet that barks', es: 'el perro' },
    { word: 'pen', en: 'you write with it', es: 'el bolígrafo' },
    { word: 'run', en: 'to move fast on your feet', es: 'correr' },
    { word: 'open', en: 'not closed', es: 'abrir' },
    { word: 'ten', en: 'the number after nine', es: 'diez' },
    { word: 'red', en: 'the colour of a tomato', es: 'rojo' },
    { word: 'book', en: 'you read it', es: 'el libro' },
    { word: 'desk', en: 'a table you study at', es: 'el escritorio' },
    { word: 'map', en: 'a drawing that shows places', es: 'el mapa' },
    { word: 'sun', en: 'the star that gives us light', es: 'el sol' },
    { word: 'hat', en: 'you wear it on your head', es: 'el sombrero' },
  ],
  A2: [
    { word: 'school', en: 'the place where children learn', es: 'la escuela' },
    { word: 'train', en: 'it travels on rails', es: 'el tren' },
    { word: 'friend', en: 'a person you like and trust', es: 'el amigo, la amiga' },
    { word: 'family', en: 'your parents, brothers and sisters', es: 'la familia' },
    { word: 'people', en: 'more than one person', es: 'la gente' },
    { word: 'water', en: 'the clear drink every living thing needs', es: 'el agua' },
    { word: 'city', en: 'a very large town', es: 'la ciudad' },
    { word: 'music', en: 'sounds organised into songs', es: 'la música' },
    { word: 'always', en: 'at all times; every time', es: 'siempre' },
    { word: 'because', en: 'it gives a reason', es: 'porque' },
    { word: 'weather', en: 'sun, rain, wind — what the sky is doing', es: 'el clima' },
    { word: 'hungry', en: 'wanting to eat', es: 'hambriento' },
  ],
  B1: [
    { word: 'problem', en: 'something difficult that needs an answer', es: 'el problema' },
    { word: 'opinion', en: 'what you think, not a fact', es: 'la opinión' },
    { word: 'discuss', en: 'to talk about something seriously', es: 'debatir' },
    { word: 'improve', en: 'to make better', es: 'mejorar' },
    { word: 'decision', en: 'a choice you make after thinking', es: 'la decisión' },
    { word: 'however', en: 'but; even so', es: 'sin embargo' },
    { word: 'suggest', en: 'to offer an idea', es: 'sugerir' },
    { word: 'reason', en: 'why something happens', es: 'la razón' },
    { word: 'result', en: 'what happens at the end', es: 'el resultado' },
    { word: 'important', en: 'mattering a lot', es: 'importante' },
    { word: 'although', en: 'even though', es: 'aunque' },
    { word: 'environment', en: 'the natural world around us', es: 'el medio ambiente' },
  ],
};

const LISTS: Record<CefrLevel, string[]> = {
  A1: GLOSSES.A1.map((g) => g.word),
  A2: GLOSSES.A2.map((g) => g.word),
  B1: GLOSSES.B1.map((g) => g.word),
};

/** How long the embedded demo round runs — the copy promises 60 seconds. */
export const DEMO_ROUND_SECONDS = 60;

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

/** The full wordlist with glosses, for the on-page starter lists. */
export function cefrGlosses(level: CefrLevel): CefrGloss[] {
  return GLOSSES[level];
}

const PACK_DIFFICULTY: Record<CefrLevel, 'easy' | 'medium' | 'hard'> = {
  A1: 'easy',
  A2: 'medium',
  B1: 'hard',
};

/**
 * The CEFR list as a lobby starter pack. The name is deliberately stable and
 * NOT localized — `?cefr=` dedupes on it, so a teacher who clicks "Run this
 * list with the class" twice gets one lesson, not two.
 */
export function cefrLessonPack(level: CefrLevel): {
  name: string;
  description: string;
  language: string;
  words: Array<{ word: string; definition: string; difficulty: 'easy' | 'medium' | 'hard' }>;
} {
  return {
    name: `CEFR ${level} Starter (ESL)`,
    description: `Twelve-word starter list for ${level} English learners, from the ESL Word Games page.`,
    language: 'en',
    words: GLOSSES[level].map((g) => ({
      word: g.word,
      definition: g.en,
      difficulty: PACK_DIFFICULTY[level],
    })),
  };
}

export function demoBoard(level: CefrLevel): { letters: string[]; targets: string[] } {
  return BOARDS[level];
}

/**
 * classroom-game honours `?cefr=` by pre-selecting (or materializing) the
 * matching starter lesson. No `mode` param — the practice-drill mode names
 * (warmup/spelling/blitz) are not classroom game modes, so the lobby keeps
 * its own default instead of swallowing a param it cannot serve.
 */
export function practiceHref(level: CefrLevel, locale: string): string {
  return `/${locale}/education/classroom-game?cefr=${level}`;
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
  time: string;
  timesUp: string;
  playAgain: string;
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
    time: 'Time',
    timesUp: 'Time! Round over — nice work.',
    playAgain: 'Play again',
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
    time: 'Tiempo',
    timesUp: '¡Tiempo! Fin de la ronda, buen trabajo.',
    playAgain: 'Jugar otra vez',
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
    time: 'זמן',
    timesUp: 'הזמן! הסיבוב נגמר — כל הכבוד.',
    playAgain: 'שחקו שוב',
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
    time: 'Tid',
    timesUp: 'Tiden är ute! Rundan är slut — bra jobbat.',
    playAgain: 'Spela igen',
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
    time: '時間',
    timesUp: '時間です！ラウンド終了。おつかれさまでした。',
    playAgain: 'もう一度遊ぶ',
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
    time: 'Время',
    timesUp: 'Время! Раунд окончен — отличная работа.',
    playAgain: 'Играть снова',
  },
};

export function playableCopy(locale: string): PlayableCopy {
  return PLAYABLE_COPY[locale] ?? PLAYABLE_COPY.en;
}
