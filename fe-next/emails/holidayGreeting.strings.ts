import type { HolidayKey } from '@/lib/holidays/calendar';

export const HOLIDAY_EMAIL_LANGUAGES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
export type HolidayEmailLanguage = (typeof HOLIDAY_EMAIL_LANGUAGES)[number];

export interface HolidayGreetingStrings {
  subject: (name: string) => string;
  preview: string;
  badge: string;
  headline: string;
  body: string;
  cta: string;
}

interface LanguageStrings {
  hanukkah: HolidayGreetingStrings;
  christmas: HolidayGreetingStrings;
  footer: string;
  unsubscribe: string;
}

const STRINGS: Record<HolidayEmailLanguage, LanguageStrings> = {
  en: {
    hanukkah: {
      subject: (name) => `Happy Hanukkah, ${name}`,
      preview: 'Eight nights, eight candles, and a golden crown at the end.',
      badge: 'FESTIVAL OF LIGHTS',
      headline: 'Happy Hanukkah!',
      body: "Wishing you and your family a warm, bright Hanukkah. This year the game is lighting up with you: play once each night to light a candle, and if you make it through all eight nights, the golden menorah crown is yours to wear.",
      cta: "Light tonight's candle",
    },
    christmas: {
      subject: (name) => `Merry Christmas, ${name}`,
      preview: 'There’s a gift waiting for you every day you play, right up to Christmas.',
      badge: 'SNOW CLASH',
      headline: 'Merry Christmas!',
      body: "We hope your holidays bring good food, good company and maybe a little snow. From now until December 25 there's a gift waiting for you every day you play, from a Santa hat to candy-cane glasses. Bring a friend along and you'll have someone to beat, too.",
      cta: "Open today's gift",
    },
    footer: 'You’re getting this because you have a LexiClash account.',
    unsubscribe: 'Unsubscribe',
  },
  he: {
    hanukkah: {
      subject: (name) => `חנוכה שמח, ${name}`,
      preview: 'שמונה ערבים, שמונה נרות, וכתר זהב שמחכה לכם בסוף.',
      badge: 'חג האורים',
      headline: 'חנוכה שמח!',
      body: 'מאחלים לכם ולכל המשפחה חג מלא אור, סופגניות וזמן ביחד. השנה גם המשחק חוגג איתכם: שחקו פעם אחת בכל ערב כדי להדליק נר, ומי שמגיע לכל שמונת הנרות מקבל לאווטאר את כתר החנוכייה המוזהב.',
      cta: 'הדליקו את הנר של הערב',
    },
    christmas: {
      subject: (name) => `חג מולד שמח, ${name}`,
      preview: 'מתנה קטנה מחכה לכם בכל יום שאתם משחקים, עד חג המולד.',
      badge: 'קרב שלג',
      headline: 'חג מולד שמח!',
      body: 'מקווים שהחגים שלכם מלאים באוכל טוב, אנשים טובים ואולי גם קצת שלג. מעכשיו ועד ה־25 בדצמבר מחכה לכם מתנה בכל יום שאתם משחקים, מכובע סנטה ועד משקפי סוכריות. ואם תביאו חבר, יהיה לכם גם מול מי להתחרות.',
      cta: 'פתחו את המתנה של היום',
    },
    footer: 'קיבלתם את המייל הזה כי יש לכם חשבון ב־LexiClash.',
    unsubscribe: 'הסרה מרשימת התפוצה',
  },
  es: {
    hanukkah: {
      subject: (name) => `¡Feliz Janucá, ${name}!`,
      preview: 'Ocho noches, ocho velas y una corona dorada esperándote al final.',
      badge: 'FIESTA DE LAS LUCES',
      headline: '¡Feliz Janucá!',
      body: 'Te deseamos una Janucá llena de luz y de buenos ratos en familia. Este año el juego también lo celebra: juega una partida cada noche para encender una vela y, si llegas a las ocho, te llevas la corona de menorá dorada para tu avatar.',
      cta: 'Enciende la vela de hoy',
    },
    christmas: {
      subject: (name) => `¡Feliz Navidad, ${name}!`,
      preview: 'Cada día que juegues hasta Navidad te espera un regalo.',
      badge: 'BATALLA DE NIEVE',
      headline: '¡Feliz Navidad!',
      body: 'Que estas fiestas vengan con buena comida, buena compañía y, con suerte, algo de nieve. Desde hoy hasta el 25 de diciembre te espera un regalo cada día que juegues, desde un gorro de Papá Noel hasta unas gafas de bastón de caramelo. Y si te traes a un amigo, ya tienes a quién ganarle.',
      cta: 'Abre el regalo de hoy',
    },
    footer: 'Te llega este correo porque tienes una cuenta en LexiClash.',
    unsubscribe: 'Darse de baja',
  },
  sv: {
    hanukkah: {
      subject: (name) => `Glad chanukka, ${name}!`,
      preview: 'Åtta kvällar, åtta ljus och en gyllene krona som väntar i slutet.',
      badge: 'LJUSENS HÖGTID',
      headline: 'Glad chanukka!',
      body: 'Vi önskar dig och din familj en varm och ljus chanukka. I år firar spelet med dig: spela en gång varje kväll för att tända ett ljus, och klarar du alla åtta kvällar får du den gyllene menorakronan till din avatar.',
      cta: 'Tänd kvällens ljus',
    },
    christmas: {
      subject: (name) => `God jul, ${name}!`,
      preview: 'Varje dag du spelar fram till juldagen väntar en present.',
      badge: 'SNÖBATALJ',
      headline: 'God jul!',
      body: 'Hoppas att julen bjuder på god mat, fina människor och kanske lite snö. Från och med nu fram till juldagen väntar en present varje dag du spelar, allt från tomteluva till polkagrisglasögon. Ta med en kompis, så har du någon att slå.',
      cta: 'Öppna dagens present',
    },
    footer: 'Du får det här mejlet eftersom du har ett LexiClash-konto.',
    unsubscribe: 'Avsluta prenumerationen',
  },
  ja: {
    hanukkah: {
      subject: (name) => `${name}さん、ハッピー・ハヌカ！`,
      preview: '8日間、毎晩ろうそくを1本ずつ。最後には金の王冠が待っています。',
      badge: '光の祭り',
      headline: 'ハッピー・ハヌカ！',
      body: 'ご家族みなさんで、あたたかく明るいハヌカをお過ごしください。今年はLexiClashも一緒にお祝いします。毎晩1回プレイするとろうそくが1本灯り、8晩すべて灯すとアバター用の「金のメノラー王冠」がもらえます。',
      cta: '今夜のろうそくを灯す',
    },
    christmas: {
      subject: (name) => `${name}さん、メリークリスマス！`,
      preview: 'クリスマスまで、プレイした日は毎日プレゼントがもらえます。',
      badge: 'スノークラッシュ',
      headline: 'メリークリスマス！',
      body: '素敵なホリデーシーズンをお過ごしください。今日から12月25日まで、プレイした日には毎日プレゼントが届きます。サンタ帽からキャンディケインのメガネまで、ぜひ全部集めてみてください。友だちを誘ってスコアで勝負するのもおすすめです。',
      cta: '今日のプレゼントを開ける',
    },
    footer: 'このメールはLexiClashアカウントをお持ちの方にお送りしています。',
    unsubscribe: '配信停止',
  },
  ru: {
    hanukkah: {
      subject: (name) => `${name}, с Ханукой!`,
      preview: 'Восемь вечеров, восемь свечей и золотая корона в конце.',
      badge: 'ПРАЗДНИК ОГНЕЙ',
      headline: 'С Ханукой!',
      body: 'Желаем вам тёплой и светлой Хануки в кругу близких. В этом году игра празднует вместе с вами: сыграйте хотя бы раз за вечер, чтобы зажечь свечу, а за все восемь вечеров вы получите для аватара золотую корону с менорой.',
      cta: 'Зажечь свечу',
    },
    christmas: {
      subject: (name) => `${name}, с наступающими праздниками!`,
      preview: 'До 25 декабря за каждый день игры вас ждёт подарок.',
      badge: 'СНЕЖНАЯ БИТВА',
      headline: 'С наступающими праздниками!',
      body: 'Пусть эта зима будет уютной: с вкусной едой, хорошими людьми и настоящим снегом. До 25 декабря за каждый день, когда вы играете, вас ждёт подарок: шапка Санты, оленьи рожки, очки-леденцы и не только. А если позвать друга, будет с кем посоревноваться.',
      cta: 'Открыть подарок дня',
    },
    footer: 'Вы получили это письмо, потому что у вас есть аккаунт LexiClash.',
    unsubscribe: 'Отписаться',
  },
};

export function asHolidayEmailLanguage(language: string | null | undefined): HolidayEmailLanguage {
  return (HOLIDAY_EMAIL_LANGUAGES as readonly string[]).includes(language ?? '')
    ? (language as HolidayEmailLanguage)
    : 'en';
}

export function getHolidayGreetingStrings(language: string, holiday: HolidayKey) {
  const lang = STRINGS[asHolidayEmailLanguage(language)];
  return { ...lang[holiday], footer: lang.footer, unsubscribe: lang.unsubscribe };
}
