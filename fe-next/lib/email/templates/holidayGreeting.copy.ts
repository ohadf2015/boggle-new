import type { HolidayKey } from '@/lib/holidays/calendar';

export const HOLIDAY_EMAIL_LANGUAGES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
export type HolidayEmailLanguage = (typeof HOLIDAY_EMAIL_LANGUAGES)[number];

export interface HolidayCopy {
  subject: (name: string) => string;
  preview: string;
  badge: string;
  headline: string;
  wish: string;
  event: string;
  cta: string;
}

interface LanguageCopy {
  dir: 'ltr' | 'rtl';
  hanukkah: HolidayCopy;
  christmas: HolidayCopy;
  greeting: (name: string) => string;
  signoff: string;
  footer: string;
  unsubscribe: string;
  privacy: string;
}

const COPY: Record<HolidayEmailLanguage, LanguageCopy> = {
  en: {
    dir: 'ltr',
    hanukkah: {
      subject: (name) => `Happy Hanukkah, ${name}`,
      preview: 'Eight nights, eight candles, and a golden crown at the end.',
      badge: 'Festival of lights',
      headline: 'Happy Hanukkah!',
      wish: 'Wishing you and your family a warm, bright Hanukkah.',
      event:
        'This year the game is lighting up with you: play once each night to light a candle, and if you make it through all eight nights, the golden menorah crown is yours to wear.',
      cta: "Light tonight's candle",
    },
    christmas: {
      subject: (name) => `Merry Christmas, ${name}`,
      preview: 'There’s a gift waiting for you every day you play, right up to Christmas.',
      badge: 'Snow Clash',
      headline: 'Merry Christmas!',
      wish: 'We hope your holidays bring good food, good company and maybe a little snow.',
      event:
        "From now until December 25 there's a gift waiting for you every day you play, from a Santa hat to candy-cane glasses. Bring a friend along and you'll have someone to beat, too.",
      cta: "Open today's gift",
    },
    greeting: (n) => `Hi ${n},`,
    signoff: 'Happy holidays from Ohad and the LexiClash team',
    footer: 'You’re getting this because you have a LexiClash account.',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
  },
  he: {
    dir: 'rtl',
    hanukkah: {
      subject: (name) => `חנוכה שמח, ${name}`,
      preview: 'שמונה ערבים, שמונה נרות, וכתר זהב שמחכה לכם בסוף.',
      badge: 'חג האורים',
      headline: 'חנוכה שמח!',
      wish: 'מאחלים לכם ולכל המשפחה חג מלא אור, סופגניות וזמן ביחד.',
      event:
        'השנה גם המשחק חוגג איתכם: שחקו פעם אחת בכל ערב כדי להדליק נר, ומי שמגיע לכל שמונת הנרות מקבל לאווטאר את כתר החנוכייה המוזהב.',
      cta: 'הדליקו את הנר של הערב',
    },
    christmas: {
      subject: (name) => `חג מולד שמח, ${name}`,
      preview: 'מתנה קטנה מחכה לכם בכל יום שאתם משחקים, עד חג המולד.',
      badge: 'קרב שלג',
      headline: 'חג מולד שמח!',
      wish: 'מקווים שהחגים שלכם מלאים באוכל טוב, אנשים טובים ואולי גם קצת שלג.',
      event:
        'מעכשיו ועד ה־25 בדצמבר מחכה לכם מתנה בכל יום שאתם משחקים, מכובע סנטה ועד משקפי סוכריות. ואם תביאו חבר, יהיה לכם גם מול מי להתחרות.',
      cta: 'פתחו את המתנה של היום',
    },
    greeting: (n) => `היי ${n},`,
    signoff: 'חג שמח מאוהד ומכל הצוות של LexiClash',
    footer: 'קיבלתם את המייל הזה כי יש לכם חשבון ב־LexiClash.',
    unsubscribe: 'הסרה מרשימת התפוצה',
    privacy: 'פרטיות',
  },
  es: {
    dir: 'ltr',
    hanukkah: {
      subject: (name) => `¡Feliz Janucá, ${name}!`,
      preview: 'Ocho noches, ocho velas y una corona dorada esperándote al final.',
      badge: 'Fiesta de las luces',
      headline: '¡Feliz Janucá!',
      wish: 'Te deseamos una Janucá llena de luz y de buenos ratos en familia.',
      event:
        'Este año el juego también lo celebra: juega una partida cada noche para encender una vela y, si llegas a las ocho, te llevas la corona de menorá dorada para tu avatar.',
      cta: 'Enciende la vela de hoy',
    },
    christmas: {
      subject: (name) => `¡Feliz Navidad, ${name}!`,
      preview: 'Cada día que juegues hasta Navidad te espera un regalo.',
      badge: 'Batalla de nieve',
      headline: '¡Feliz Navidad!',
      wish: 'Que estas fiestas vengan con buena comida, buena compañía y, con suerte, algo de nieve.',
      event:
        'Desde hoy hasta el 25 de diciembre te espera un regalo cada día que juegues, desde un gorro de Papá Noel hasta unas gafas de bastón de caramelo. Y si te traes a un amigo, ya tienes a quién ganarle.',
      cta: 'Abre el regalo de hoy',
    },
    greeting: (n) => `¡Hola, ${n}!`,
    signoff: 'Felices fiestas de parte de Ohad y del equipo de LexiClash',
    footer: 'Te llega este correo porque tienes una cuenta en LexiClash.',
    unsubscribe: 'Darse de baja',
    privacy: 'Privacidad',
  },
  sv: {
    dir: 'ltr',
    hanukkah: {
      subject: (name) => `Glad chanukka, ${name}!`,
      preview: 'Åtta kvällar, åtta ljus och en gyllene krona som väntar i slutet.',
      badge: 'Ljusens högtid',
      headline: 'Glad chanukka!',
      wish: 'Vi önskar dig och din familj en varm och ljus chanukka.',
      event:
        'I år firar spelet med dig: spela en gång varje kväll för att tända ett ljus, och klarar du alla åtta kvällar får du den gyllene menorakronan till din avatar.',
      cta: 'Tänd kvällens ljus',
    },
    christmas: {
      subject: (name) => `God jul, ${name}!`,
      preview: 'Varje dag du spelar fram till juldagen väntar en present.',
      badge: 'Snöbatalj',
      headline: 'God jul!',
      wish: 'Hoppas att julen bjuder på god mat, fina människor och kanske lite snö.',
      event:
        'Från och med nu fram till juldagen väntar en present varje dag du spelar, allt från tomteluva till polkagrisglasögon. Ta med en kompis, så har du någon att slå.',
      cta: 'Öppna dagens present',
    },
    greeting: (n) => `Hej ${n}!`,
    signoff: 'Glada helger önskar Ohad och hela LexiClash',
    footer: 'Du får det här mejlet eftersom du har ett LexiClash-konto.',
    unsubscribe: 'Avsluta prenumerationen',
    privacy: 'Integritet',
  },
  ja: {
    dir: 'ltr',
    hanukkah: {
      subject: (name) => `${name}さん、ハッピー・ハヌカ！`,
      preview: '8日間、毎晩ろうそくを1本ずつ。最後には金の王冠が待っています。',
      badge: '光の祭り',
      headline: 'ハッピー・ハヌカ！',
      wish: 'ご家族みなさんで、あたたかく明るいハヌカをお過ごしください。',
      event:
        '今年はLexiClashも一緒にお祝いします。毎晩1回プレイするとろうそくが1本灯り、8晩すべて灯すとアバター用の「金のメノラー王冠」がもらえます。',
      cta: '今夜のろうそくを灯す',
    },
    christmas: {
      subject: (name) => `${name}さん、メリークリスマス！`,
      preview: 'クリスマスまで、プレイした日は毎日プレゼントがもらえます。',
      badge: 'スノークラッシュ',
      headline: 'メリークリスマス！',
      wish: '素敵なホリデーシーズンをお過ごしください。',
      event:
        '今日から12月25日まで、プレイした日には毎日プレゼントが届きます。サンタ帽からキャンディケインのメガネまで、ぜひ全部集めてみてください。友だちを誘ってスコアで勝負するのもおすすめです。',
      cta: '今日のプレゼントを開ける',
    },
    greeting: (n) => `${n}さん、こんにちは。`,
    signoff: 'よいホリデーを。LexiClashのOhadとチームより',
    footer: 'このメールはLexiClashアカウントをお持ちの方にお送りしています。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
  },
  ru: {
    dir: 'ltr',
    hanukkah: {
      subject: (name) => `${name}, с Ханукой!`,
      preview: 'Восемь вечеров, восемь свечей и золотая корона в конце.',
      badge: 'Праздник огней',
      headline: 'С Ханукой!',
      wish: 'Желаем вам тёплой и светлой Хануки в кругу близких.',
      event:
        'В этом году игра празднует вместе с вами: сыграйте хотя бы раз за вечер, чтобы зажечь свечу, а за все восемь вечеров вы получите для аватара золотую корону с менорой.',
      cta: 'Зажечь свечу',
    },
    christmas: {
      subject: (name) => `${name}, с наступающими праздниками!`,
      preview: 'До 25 декабря за каждый день игры вас ждёт подарок.',
      badge: 'Снежная битва',
      headline: 'С наступающими праздниками!',
      wish: 'Пусть эта зима будет уютной: с вкусной едой, хорошими людьми и настоящим снегом.',
      event:
        'До 25 декабря за каждый день, когда вы играете, вас ждёт подарок: шапка Санты, оленьи рожки, очки-леденцы и не только. А если позвать друга, будет с кем посоревноваться.',
      cta: 'Открыть подарок дня',
    },
    greeting: (n) => `Здравствуйте, ${n}!`,
    signoff: 'С праздниками! Охад и команда LexiClash',
    footer: 'Вы получили это письмо, потому что у вас есть аккаунт LexiClash.',
    unsubscribe: 'Отписаться',
    privacy: 'Конфиденциальность',
  },
};

export function asHolidayEmailLanguage(language: string | null | undefined): HolidayEmailLanguage {
  return (HOLIDAY_EMAIL_LANGUAGES as readonly string[]).includes(language ?? '')
    ? (language as HolidayEmailLanguage)
    : 'en';
}

export function getHolidayCopy(language: string, holiday: HolidayKey) {
  const { hanukkah, christmas, ...shared } = COPY[asHolidayEmailLanguage(language)];
  return { ...shared, ...(holiday === 'hanukkah' ? hanukkah : christmas) };
}
