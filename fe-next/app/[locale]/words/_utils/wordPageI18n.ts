/**
 * Server-side translations for /words/* pages.
 *
 * These pages are Server Components and cannot use useLanguage().
 * This lightweight map provides locale-specific strings without
 * requiring client-side JS, keeping the pages fully SSR for SEO.
 */

interface WordPageStrings {
  // Common
  home: string;
  words: string;
  playNow: string;
  totalWords: string;
  lengthGroups: string;
  browseAllLetters: string;
  browseByLength: string;
  browseByLetter: string;
  exploreOtherLengths: string;
  // Starting with page
  wordsStartingWith: (letter: string) => string;
  browseWordsStartingWith: (count: number, letter: string) => string;
  howManyCanYouFind: (letter: string) => string;
  spotThemFast: string;
  letterWords: (n: number) => string;
  seeAllNLetterWords: (n: number) => string;
  // N-letter words page
  allNLetterWords: (n: number) => string;
  exploreNLetterWords: (count: number, n: number) => string;
  thinkYouKnow: (n: number) => string;
  putVocabToTest: string;
  wordsLabel: string;
  basePtsEach: string;
  fireRoundPts: string;
  // Individual word page
  wordSolver: string;
  valid: string;
  notValid: string;
  letters: string;
  scoring: string;
  noCombo: string;
  fireRound: string;
  wordFacts: string;
  length: string;
  uniqueLetters: string;
  startsWith: string;
  endsWith: string;
  exploreMore: string;
  nLetterWords: (n: number) => string;
  wordsStartingWithLetter: (letter: string) => string;
  dailyChallenge: string;
  canYouFindThisWord: string;
  repeated: string;
}

const en: WordPageStrings = {
  home: 'Home',
  words: 'Words',
  playNow: 'Play Now →',
  totalWords: 'total words',
  lengthGroups: 'length groups',
  browseAllLetters: 'Browse All Letters',
  browseByLength: 'Browse by Word Length',
  browseByLetter: 'Browse by Starting Letter',
  exploreOtherLengths: 'Explore Other Lengths',
  wordsStartingWith: (l) => `Words Starting With ${l}`,
  browseWordsStartingWith: (c, l) =>
    `Browse ${c} LexiClash words beginning with the letter ${l}, grouped by word length. Each word shows its base score — click to see full details.`,
  howManyCanYouFind: (l) => `How many ${l}- words can you find?`,
  spotThemFast: 'Spot them fast on the grid and rack up combo bonuses!',
  letterWords: (n) => `${n}-Letter Words`,
  seeAllNLetterWords: (n) => `see all ${n}-letter words →`,
  allNLetterWords: (n) => `All ${n}-Letter Words`,
  exploreNLetterWords: (c, n) =>
    `Explore all ${c} valid ${n}-letter words in the LexiClash dictionary. Each word shows its base score — longer words earn more points in the game. Click any word to see its full scoring breakdown and letter analysis.`,
  thinkYouKnow: (n) => `Think you know your ${n}-letter words?`,
  putVocabToTest: 'Put your vocabulary to the test — find these words on the grid under time pressure!',
  wordsLabel: 'words',
  basePtsEach: 'base pts each',
  fireRoundPts: 'fire round pts',
  wordSolver: '← Word Solver',
  valid: 'Valid',
  notValid: 'Not Valid',
  letters: 'Letters',
  scoring: 'Scoring',
  noCombo: 'No combo',
  fireRound: 'Fire Round (2x)',
  wordFacts: 'Word Facts',
  length: 'Length',
  uniqueLetters: 'Unique Letters',
  startsWith: 'Starts With',
  endsWith: 'Ends With',
  exploreMore: 'Explore More',
  nLetterWords: (n) => `${n}-letter words`,
  wordsStartingWithLetter: (l) => `Words starting with ${l}`,
  dailyChallenge: 'Daily Challenge',
  canYouFindThisWord: 'Can you find this word on the grid?',
  repeated: 'Repeated',
};

const he: WordPageStrings = {
  home: 'דף הבית',
  words: 'מילים',
  playNow: '← שחקו עכשיו',
  totalWords: 'סה"כ מילים',
  lengthGroups: 'קבוצות אורך',
  browseAllLetters: 'עיינו לפי אות',
  browseByLength: 'עיינו לפי אורך מילה',
  browseByLetter: 'עיינו לפי אות פתיחה',
  exploreOtherLengths: 'אורכים נוספים',
  wordsStartingWith: (l) => `מילים שמתחילות ב-${l}`,
  browseWordsStartingWith: (c, l) =>
    `עיינו ב-${c} מילים ב-LexiClash שמתחילות באות ${l}, מקובצות לפי אורך. כל מילה מציגה את הניקוד הבסיסי שלה.`,
  howManyCanYouFind: (l) => `כמה מילים עם ${l} תוכלו למצוא?`,
  spotThemFast: 'מצאו אותן מהר על הלוח וצברו בונוסים!',
  letterWords: (n) => `מילים בנות ${n} אותיות`,
  seeAllNLetterWords: (n) => `ראו את כל המילים בנות ${n} אותיות ←`,
  allNLetterWords: (n) => `כל המילים בנות ${n} אותיות`,
  exploreNLetterWords: (c, n) =>
    `גלו ${c} מילים תקינות בנות ${n} אותיות במילון LexiClash. כל מילה מציגה את הניקוד הבסיסי שלה — מילים ארוכות שוות יותר נקודות. לחצו על מילה לפירוט מלא.`,
  thinkYouKnow: (n) => `חושבים שאתם מכירים מילים בנות ${n} אותיות?`,
  putVocabToTest: 'בדקו את אוצר המילים שלכם — מצאו מילים על הלוח תחת לחץ זמן!',
  wordsLabel: 'מילים',
  basePtsEach: 'נק\' בסיס',
  fireRoundPts: 'נק\' סיבוב אש',
  wordSolver: 'פותר מילים →',
  valid: 'תקינה',
  notValid: 'לא תקינה',
  letters: 'אותיות',
  scoring: 'ניקוד',
  noCombo: 'ללא קומבו',
  fireRound: 'סיבוב אש (×2)',
  wordFacts: 'עובדות על המילה',
  length: 'אורך',
  uniqueLetters: 'אותיות ייחודיות',
  startsWith: 'מתחילה ב',
  endsWith: 'מסתיימת ב',
  exploreMore: 'גלו עוד',
  nLetterWords: (n) => `מילים בנות ${n} אותיות`,
  wordsStartingWithLetter: (l) => `מילים שמתחילות ב-${l}`,
  dailyChallenge: 'אתגר יומי',
  canYouFindThisWord: 'תוכלו למצוא את המילה הזו על הלוח?',
  repeated: 'חוזרות',
};

const sv: WordPageStrings = {
  home: 'Hem',
  words: 'Ord',
  playNow: 'Spela nu →',
  totalWords: 'totalt antal ord',
  lengthGroups: 'längdgrupper',
  browseAllLetters: 'Bläddra alla bokstäver',
  browseByLength: 'Bläddra efter ordlängd',
  browseByLetter: 'Bläddra efter startbokstav',
  exploreOtherLengths: 'Utforska andra längder',
  wordsStartingWith: (l) => `Ord som börjar med ${l}`,
  browseWordsStartingWith: (c, l) =>
    `Bläddra bland ${c} LexiClash-ord som börjar med bokstaven ${l}, grupperade efter längd. Varje ord visar sin baspoäng.`,
  howManyCanYouFind: (l) => `Hur många ${l}-ord kan du hitta?`,
  spotThemFast: 'Hitta dem snabbt på brädet och samla kombobonusar!',
  letterWords: (n) => `${n}-bokstavsord`,
  seeAllNLetterWords: (n) => `se alla ${n}-bokstavsord →`,
  allNLetterWords: (n) => `Alla ${n}-bokstavsord`,
  exploreNLetterWords: (c, n) =>
    `Utforska alla ${c} giltiga ${n}-bokstavsord i LexiClash-ordboken. Varje ord visar sin baspoäng — längre ord ger mer poäng. Klicka på ett ord för fullständig poänguppdelning.`,
  thinkYouKnow: (n) => `Tror du att du kan dina ${n}-bokstavsord?`,
  putVocabToTest: 'Testa ditt ordförråd — hitta orden på brädet under tidspress!',
  wordsLabel: 'ord',
  basePtsEach: 'baspoäng',
  fireRoundPts: 'eldrunda poäng',
  wordSolver: '← Ordlösare',
  valid: 'Giltigt',
  notValid: 'Ogiltigt',
  letters: 'Bokstäver',
  scoring: 'Poäng',
  noCombo: 'Ingen kombo',
  fireRound: 'Eldrunda (2x)',
  wordFacts: 'Ordfakta',
  length: 'Längd',
  uniqueLetters: 'Unika bokstäver',
  startsWith: 'Börjar med',
  endsWith: 'Slutar med',
  exploreMore: 'Utforska mer',
  nLetterWords: (n) => `${n}-bokstavsord`,
  wordsStartingWithLetter: (l) => `Ord som börjar med ${l}`,
  dailyChallenge: 'Daglig utmaning',
  canYouFindThisWord: 'Kan du hitta detta ord på brädet?',
  repeated: 'Upprepade',
};

const ja: WordPageStrings = {
  home: 'ホーム',
  words: '単語',
  playNow: '今すぐプレイ →',
  totalWords: '合計単語数',
  lengthGroups: '長さグループ',
  browseAllLetters: 'すべての文字を見る',
  browseByLength: '文字数で探す',
  browseByLetter: '頭文字で探す',
  exploreOtherLengths: '他の文字数を探す',
  wordsStartingWith: (l) => `${l}で始まる単語`,
  browseWordsStartingWith: (c, l) =>
    `${l}で始まるLexiClash単語${c}語を文字数別に閲覧。各単語の基本スコアを表示。`,
  howManyCanYouFind: (l) => `${l}の単語をいくつ見つけられますか？`,
  spotThemFast: 'グリッドで素早く見つけてコンボボーナスを獲得！',
  letterWords: (n) => `${n}文字の単語`,
  seeAllNLetterWords: (n) => `${n}文字の単語をすべて見る →`,
  allNLetterWords: (n) => `すべての${n}文字単語`,
  exploreNLetterWords: (c, n) =>
    `LexiClash辞書の有効な${n}文字単語${c}語を探索。各単語の基本スコアを表示。クリックで詳細なスコア内訳を確認。`,
  thinkYouKnow: (n) => `${n}文字の単語をどれだけ知っていますか？`,
  putVocabToTest: '語彙力を試そう — 制限時間内にグリッドで単語を見つけよう！',
  wordsLabel: '語',
  basePtsEach: '基本ポイント',
  fireRoundPts: 'ファイアラウンド',
  wordSolver: '← 単語ソルバー',
  valid: '有効',
  notValid: '無効',
  letters: '文字',
  scoring: 'スコアリング',
  noCombo: 'コンボなし',
  fireRound: 'ファイアラウンド (2x)',
  wordFacts: '単語の情報',
  length: '長さ',
  uniqueLetters: 'ユニークな文字',
  startsWith: '最初の文字',
  endsWith: '最後の文字',
  exploreMore: 'もっと探す',
  nLetterWords: (n) => `${n}文字の単語`,
  wordsStartingWithLetter: (l) => `${l}で始まる単語`,
  dailyChallenge: 'デイリーチャレンジ',
  canYouFindThisWord: 'グリッドでこの単語を見つけられますか？',
  repeated: '繰り返し',
};

const es: WordPageStrings = {
  home: 'Inicio',
  words: 'Palabras',
  playNow: 'Jugar ahora →',
  totalWords: 'palabras totales',
  lengthGroups: 'grupos por longitud',
  browseAllLetters: 'Ver todas las letras',
  browseByLength: 'Explorar por longitud',
  browseByLetter: 'Explorar por letra inicial',
  exploreOtherLengths: 'Explorar otras longitudes',
  wordsStartingWith: (l) => `Palabras que empiezan con ${l}`,
  browseWordsStartingWith: (c, l) =>
    `Explora ${c} palabras de LexiClash que empiezan con la letra ${l}, agrupadas por longitud. Cada palabra muestra su puntuación base.`,
  howManyCanYouFind: (l) => `¿Cuántas palabras con ${l} puedes encontrar?`,
  spotThemFast: '¡Encuéntralas rápido en el tablero y acumula bonos de combo!',
  letterWords: (n) => `Palabras de ${n} letras`,
  seeAllNLetterWords: (n) => `ver todas las palabras de ${n} letras →`,
  allNLetterWords: (n) => `Todas las palabras de ${n} letras`,
  exploreNLetterWords: (c, n) =>
    `Explora las ${c} palabras válidas de ${n} letras en el diccionario de LexiClash. Cada palabra muestra su puntuación base — las palabras más largas dan más puntos. Haz clic en cualquier palabra para ver su desglose completo.`,
  thinkYouKnow: (n) => `¿Crees que conoces las palabras de ${n} letras?`,
  putVocabToTest: '¡Pon a prueba tu vocabulario — encuentra palabras en el tablero bajo presión de tiempo!',
  wordsLabel: 'palabras',
  basePtsEach: 'pts base',
  fireRoundPts: 'pts ronda de fuego',
  wordSolver: '← Buscador de palabras',
  valid: 'Válida',
  notValid: 'No válida',
  letters: 'Letras',
  scoring: 'Puntuación',
  noCombo: 'Sin combo',
  fireRound: 'Ronda de fuego (2x)',
  wordFacts: 'Datos de la palabra',
  length: 'Longitud',
  uniqueLetters: 'Letras únicas',
  startsWith: 'Empieza con',
  endsWith: 'Termina con',
  exploreMore: 'Explorar más',
  nLetterWords: (n) => `Palabras de ${n} letras`,
  wordsStartingWithLetter: (l) => `Palabras que empiezan con ${l}`,
  dailyChallenge: 'Desafío diario',
  canYouFindThisWord: '¿Puedes encontrar esta palabra en el tablero?',
  repeated: 'Repetidas',
};

const translations: Record<string, WordPageStrings> = { en, he, sv, ja, es };

/**
 * Get word page translations for a given locale.
 * Falls back to English if locale is unknown.
 */
export function getWordPageStrings(locale: string): WordPageStrings {
  return translations[locale] ?? en;
}
