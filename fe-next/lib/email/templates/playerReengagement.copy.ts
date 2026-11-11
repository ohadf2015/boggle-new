import type { PlayerLocale } from './playerWelcome.copy';

export interface ReengagementCopy {
  dir: 'ltr' | 'rtl';
  numberLocale: string;
  preheader: (letter: string) => string;
  kicker: string;
  headline: string;
  greeting: (name: string) => string;
  hint: string;
  pitch: string;
  missedDays: (n: number) => string;
  solvedLabel: string;
  hours: (h: number) => string;
  hoursLabel: string;
  modesTitle: string;
  cta: string;
  signoff: string;
  footnote: string;
  unsubscribe: string;
  privacy: string;
}

type Line = (letter: string, name: string) => string;

export const SUBJECT_LINES: Record<string, Line[]> = {
  en: [
    (l) => `ok but the first letter is "${l}"...`,
    (_l, n) => `${n}, it's been a minute`,
    (l) => `today's word starts with "${l}", that's all i'll say`,
    (l) => `one word, about 30 seconds, starts with "${l}"`,
    (_l, n) => `${n}, lexi saved your seat`,
    (l) => `small hint: "${l}" _ _ _`,
  ],
  he: [
    (l) => `אוקיי, אבל האות הראשונה היא "${l}"...`,
    (_l, n) => `${n}, עבר קצת זמן`,
    (l) => `המילה של היום מתחילה ב-"${l}", ויותר לא אגלה`,
    (l) => `מילה אחת, 30 שניות בערך, מתחילה ב-"${l}"`,
    (_l, n) => `${n}, לקסי שמרה לך מקום`,
    (l) => `רמז קטן: "${l}" _ _ _`,
  ],
  sv: [
    (l) => `okej, men första bokstaven är "${l}"...`,
    (_l, n) => `${n}, det var ett tag sen`,
    (l) => `dagens ord börjar på "${l}", mer säger jag inte`,
    (l) => `ett ord, ungefär 30 sekunder, börjar på "${l}"`,
    (_l, n) => `${n}, lexi har sparat din plats`,
    (l) => `liten ledtråd: "${l}" _ _ _`,
  ],
  ja: [
    (l) => `最初の文字は「${l}」なんですが…`,
    (_l, n) => `${n}さん、おひさしぶりです`,
    (l) => `今日の単語は「${l}」から。ヒントはここまで`,
    (l) => `30秒ほどで一単語、「${l}」から始まります`,
    (_l, n) => `${n}さん、レキシが席を取っておきました`,
    (l) => `小さなヒント：「${l}」＿＿＿`,
  ],
  es: [
    (l) => `vale, pero la primera letra es "${l}"...`,
    (_l, n) => `${n}, cuánto tiempo`,
    (l) => `la palabra de hoy empieza por "${l}", no digo más`,
    (l) => `una palabra, unos 30 segundos, empieza por "${l}"`,
    (_l, n) => `${n}, lexi te guardó el sitio`,
    (l) => `pista pequeña: "${l}" _ _ _`,
  ],
  ru: [
    (l) => `ладно, но первая буква «${l}»...`,
    (_l, n) => `${n}, давно не виделись`,
    (l) => `слово дня начинается на «${l}», больше ни слова`,
    (l) => `одно слово, секунд 30, начинается на «${l}»`,
    (_l, n) => `${n}, Лекси держит для тебя место`,
    (l) => `маленькая подсказка: «${l}» _ _ _`,
  ],
};

function ruDays(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return 'день';
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'дня';
  return 'дней';
}

export const REENGAGEMENT_COPY: Record<PlayerLocale, ReengagementCopy> = {
  en: {
    dir: 'ltr',
    numberLocale: 'en-US',
    preheader: (l) => `Today's word starts with ${l}. One round takes about 30 seconds.`,
    kicker: 'Daily word',
    headline: "Today's puzzle is live",
    greeting: (n) => `${n}, long time no spell.`,
    hint: "Today's word starts with this letter:",
    pitch: 'One word and about 30 seconds. You could solve it before your coffee cools down.',
    missedDays: (n) => `It's been ${n} days since your last puzzle, and today's word is waiting for you.`,
    solvedLabel: 'players solved it today',
    hours: (h) => `${h}h`,
    hoursLabel: 'until it resets',
    modesTitle: 'Or try another game',
    cta: "Play today's word",
    signoff: 'See you on the board. Ohad, LexiClash',
    footnote: 'You get this because you signed up for daily word reminders.',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
  },
  he: {
    dir: 'rtl',
    numberLocale: 'he-IL',
    preheader: (l) => `המילה של היום מתחילה ב-${l}. סיבוב לוקח בערך 30 שניות.`,
    kicker: 'המילה היומית',
    headline: 'החידה של היום עלתה',
    greeting: (n) => `${n}, מזמן לא התראינו!`,
    hint: 'המילה של היום מתחילה באות:',
    pitch: 'מילה אחת ובערך 30 שניות. אפשר לפתור אותה עוד לפני שהקפה מתקרר.',
    missedDays: (n) => `עברו ${n} ימים מהחידה האחרונה שלכם, והמילה של היום כבר מחכה.`,
    solvedLabel: 'שחקנים כבר פתרו היום',
    hours: (h) => `${h} שעות`,
    hoursLabel: 'עד שהחידה מתחלפת',
    modesTitle: 'או לנסות משחק אחר',
    cta: 'לשחק במילה של היום',
    signoff: 'נתראה על הלוח. אוהד, LexiClash',
    footnote: 'קיבלתם את המייל הזה כי נרשמתם לתזכורות של המילה היומית.',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
  },
  sv: {
    dir: 'ltr',
    numberLocale: 'sv-SE',
    preheader: (l) => `Dagens ord börjar på ${l}. En runda tar ungefär 30 sekunder.`,
    kicker: 'Dagens ord',
    headline: 'Dagens pussel är ute',
    greeting: (n) => `${n}, det var ett tag sen!`,
    hint: 'Dagens ord börjar på den här bokstaven:',
    pitch: 'Ett ord och ungefär 30 sekunder. Du hinner nog lösa det innan kaffet kallnar.',
    missedDays: (n) => `Det har gått ${n} dagar sedan ditt senaste pussel, och dagens ord väntar på dig.`,
    solvedLabel: 'spelare har löst det idag',
    hours: (h) => `${h} h`,
    hoursLabel: 'tills det nollställs',
    modesTitle: 'Eller testa ett annat spel',
    cta: 'Spela dagens ord',
    signoff: 'Vi ses på brädet. Ohad, LexiClash',
    footnote: 'Du får det här för att du anmälde dig till dagliga ordpåminnelser.',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
  },
  ja: {
    dir: 'ltr',
    numberLocale: 'ja-JP',
    preheader: (l) => `今日の単語は「${l}」から始まります。1回およそ30秒です。`,
    kicker: '今日の単語',
    headline: '今日のパズルが公開中',
    greeting: (n) => `${n}さん、おひさしぶりです。`,
    hint: '今日の単語は、この文字から始まります。',
    pitch: '単語ひとつ、およそ30秒です。コーヒーが冷める前に解けるかもしれません。',
    missedDays: (n) => `前回のパズルから${n}日たちました。今日の単語が待っています。`,
    solvedLabel: '人が今日もう解きました',
    hours: (h) => `${h}時間`,
    hoursLabel: 'でリセット',
    modesTitle: 'ほかのゲームもどうぞ',
    cta: '今日の単語で遊ぶ',
    signoff: 'ボードでお待ちしています。LexiClashのOhadより',
    footnote: '毎日の単語リマインダーに登録されているため、このメールをお送りしています。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
  },
  es: {
    dir: 'ltr',
    numberLocale: 'es-ES',
    preheader: (l) => `La palabra de hoy empieza por ${l}. Una partida dura unos 30 segundos.`,
    kicker: 'Palabra del día',
    headline: 'El reto de hoy ya está aquí',
    greeting: (n) => `${n}, ¡cuánto tiempo!`,
    hint: 'La palabra de hoy empieza por esta letra:',
    pitch: 'Una palabra y unos 30 segundos. A ver si la sacas antes de que se enfríe el café.',
    missedDays: (n) => `Han pasado ${n} días desde tu último reto, y la palabra de hoy te está esperando.`,
    solvedLabel: 'jugadores ya la resolvieron hoy',
    hours: (h) => `${h} h`,
    hoursLabel: 'para que se reinicie',
    modesTitle: 'O prueba otro juego',
    cta: 'Jugar la palabra de hoy',
    signoff: 'Nos vemos en el tablero. Ohad, de LexiClash',
    footnote: 'Recibes esto porque te suscribiste a los recordatorios diarios de palabras.',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
  },
  ru: {
    dir: 'ltr',
    numberLocale: 'ru-RU',
    preheader: (l) => `Слово дня начинается на «${l}». Раунд занимает около 30 секунд.`,
    kicker: 'Слово дня',
    headline: 'Загадка дня уже ждёт',
    greeting: (n) => `${n}, давно не виделись!`,
    hint: 'Слово дня начинается с этой буквы:',
    pitch: 'Одно слово и около 30 секунд. Успеешь разгадать, пока не остыл кофе?',
    missedDays: (n) => `Тебя не было ${n} ${ruDays(n)}, а слово дня уже ждёт.`,
    solvedLabel: 'уже разгадали сегодня',
    hours: (h) => `${h} ч`,
    hoursLabel: 'до обновления',
    modesTitle: 'Или попробуй другую игру',
    cta: 'Сыграть в слово дня',
    signoff: 'Увидимся на поле. Охад, LexiClash',
    footnote: 'Это письмо пришло, потому что включены ежедневные напоминания о слове дня.',
    unsubscribe: 'Отписаться',
    privacy: 'Конфиденциальность',
  },
};
