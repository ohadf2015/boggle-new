const PATH = [4, 1, 6, 9, 14];

const BOARDS: Record<string, { word: string; filler: string; mirrored?: boolean }> = {
  en: { word: 'CLASH', filler: 'TRAEOMNIDLG' },
  he: { word: 'מילים', filler: 'רתאבגקנהשדע', mirrored: true },
  sv: { word: 'ORDEN', filler: 'ÄTRNSLÖKGIÅ' },
  ja: { word: 'しりとり', filler: 'かさたなまらきにみすてこ' },
  es: { word: 'JUEGO', filler: 'ÑARSTLCIDOM' },
  ru: { word: 'СЛОВО', filler: 'КАРТЕНИДМЯШ' },
};

export interface InstallPromoBoard {
  word: string;
  letters: string[];
  path: number[];
}

export function installPromoBoard(locale: string): InstallPromoBoard {
  const { word, filler, mirrored } = BOARDS[locale] ?? BOARDS.en;
  const wordLetters = [...word];
  const path = PATH.slice(0, wordLetters.length).map((cell) =>
    mirrored ? cell - (cell % 4) + (3 - (cell % 4)) : cell,
  );
  const fill = [...filler];
  let next = 0;
  const letters = Array.from({ length: 16 }, (_, cell) => {
    const inWord = path.indexOf(cell);
    return inWord >= 0 ? wordLetters[inWord] : fill[next++ % fill.length];
  });
  return { word, letters, path };
}
