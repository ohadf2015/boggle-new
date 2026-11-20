import type { BoardData, SolverData } from './arts';
import type { CardCopy, OgLang } from './brand';

export const BOARDS: Record<OgLang, BoardData> = {
  en: {
    rows: [['W', 'O', 'T', 'E'], ['A', 'R', 'I', 'N'], ['L', 'D', 'S', 'K'], ['E', 'M', 'P', 'Y']],
    path: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
  },
  he: {
    rows: [['ל', 'ר', 'ש', 'מ'], ['א', 'ק', 'ח', 'ת'], ['נ', 'ו', 'י', 'ב'], ['ע', 'ג', 'ד', 'ה']],
    path: [[0, 3], [0, 2], [1, 2], [1, 1]],
  },
  sv: {
    rows: [['S', 'P', 'Å', 'R'], ['T', 'E', 'L', 'Ö'], ['K', 'Ä', 'A', 'N'], ['O', 'R', 'D', 'M']],
    path: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
  },
  ja: {
    rows: [['こ', 'と', 'ば', 'す'], ['ね', 'か', 'り', 'う'], ['み', 'の', 'あ', 'き'], ['も', 'た', 'て', 'ふ']],
    path: [[0, 0], [0, 1], [0, 2]],
  },
  es: {
    rows: [['J', 'U', 'E', 'R'], ['A', 'L', 'G', 'S'], ['P', 'O', 'T', 'N'], ['I', 'C', 'M', 'A']],
    path: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 1]],
  },
  ru: {
    rows: [['С', 'Л', 'Н', 'К'], ['Т', 'О', 'В', 'Д'], ['А', 'О', 'Р', 'Е'], ['М', 'И', 'Ш', 'У']],
    path: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 1]],
  },
};

export const SOLVERS: Record<OgLang, SolverData> = {
  en: { rack: ['S', 'T', 'A', 'R', 'E', 'D'], words: ['STARED', 'TRADES', 'DATES', 'STAR'] },
  he: { rack: ['כ', 'ל', 'ב', 'ה', 'ש'], words: ['כלבה', 'כלב', 'כבש', 'שכל'] },
  sv: { rack: ['S', 'T', 'O', 'R', 'A', 'K'], words: ['STORA', 'KORTA', 'ROST', 'OST'] },
  ja: { rack: ['か', 'さ', 'な', 'た', 'い', 'ら'], words: ['さかな', 'かさ', 'いか', 'なか'] },
  es: { rack: ['C', 'O', 'S', 'T', 'A', 'R'], words: ['COSTAR', 'ROSA', 'CASO', 'ROTA'] },
  ru: { rack: ['С', 'Л', 'О', 'В', 'А', 'Р'], words: ['СЛОВА', 'ОСА', 'ВАЛ', 'РОВ'] },
};

export const SITE_CARD: Record<OgLang, CardCopy> = {
  en: { kicker: 'Word game', title: 'LexiClash', line: 'Live word battles with friends, right in your browser.', cta: 'Play free' },
  he: { kicker: 'משחק מילים', title: 'LexiClash', line: 'קרבות מילים בזמן אמת עם חברים, ישר בדפדפן', cta: 'שחקו בחינם' },
  sv: { kicker: 'Ordspel', title: 'LexiClash', line: 'Ordstrider i realtid med vänner, direkt i webbläsaren.', cta: 'Spela gratis' },
  ja: { kicker: 'ワードゲーム', title: 'LexiClash', line: '友達とリアルタイムで単語バトル！', cta: '無料でプレイ' },
  es: { kicker: 'Juego de palabras', title: 'LexiClash', line: 'Batallas de palabras en vivo con amigos, desde el navegador.', cta: 'Juega gratis' },
  ru: { kicker: 'Игра в слова', title: 'LexiClash', line: 'Словесные битвы с друзьями в реальном времени, прямо в браузере.', cta: 'Играть бесплатно' },
};

export const PLAY_BOGGLE_CARD: CardCopy = {
  kicker: 'No download, no signup',
  title: 'Play Boggle Online Free',
  line: 'Solo against bots or live with friends, from 2 up to 50 players.',
  cta: 'Play now',
};

export const FRIENDS_CARD: CardCopy = {
  kicker: 'Real time, no app',
  title: 'Word Games With Friends',
  line: 'No turns to wait for. Share a link and race on the same board.',
  cta: 'Create a room',
};

export const ES_SCRABBLE_CARD: CardCopy = {
  kicker: 'Sin registro',
  title: 'Scrabble Online en Español',
  line: 'Crea una sala, invita a tus amigos y compite en tiempo real.',
  cta: 'Juega gratis',
};

export const SV_SCRABBLE_CARD: CardCopy = {
  kicker: 'Gratis, ingen app',
  title: 'Spela Scrabble Svenska',
  line: 'Bjud in vänner och tävla i realtid, utan att ladda ner något.',
  cta: 'Spela gratis',
};

export const SOLVER_KICKER: Record<OgLang, string> = {
  en: 'Free tool',
  he: 'כלי חינמי',
  sv: 'Gratis verktyg',
  ja: '無料ツール',
  es: 'Herramienta gratis',
  ru: 'Бесплатный инструмент',
};

export const SOLVER_CTA: Record<OgLang, string> = {
  en: 'Solve letters',
  he: 'פענחו אותיות',
  sv: 'Lös bokstäver',
  ja: '文字を解く',
  es: 'Resolver letras',
  ru: 'Решить буквы',
};

export function solverCard(lang: OgLang, page: { title: string; subtitle: string }): CardCopy {
  return { kicker: SOLVER_KICKER[lang], title: page.title, line: page.subtitle, cta: SOLVER_CTA[lang] };
}
