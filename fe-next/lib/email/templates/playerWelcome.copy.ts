export type PlayerLocale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

export interface WelcomeCopy {
  dir: 'ltr' | 'rtl';
  subject: (name: string) => string;
  preheader: string;
  kicker: string;
  headline: string;
  greeting: (name: string) => string;
  intro: string;
  tour: string;
  modesTitle: string;
  cta: string;
  android: string;
  signoff: string;
  footnote: string;
  unsubscribe: string;
  privacy: string;
}

export const WELCOME_COPY: Record<PlayerLocale, WelcomeCopy> = {
  en: {
    dir: 'ltr',
    subject: (n) => `Hi ${n}, pick your first word game`,
    preheader: "Here's what a round looks like, and every game you can play today.",
    kicker: 'Welcome aboard',
    headline: 'Your word games are ready',
    greeting: (n) => `Hi ${n},`,
    intro:
      "Thanks for joining LexiClash. I made it for people who can't walk past a word puzzle, so you're in good company. Here's a quick look at a real round, and below it every game you can jump into right now.",
    tour: 'Tap to watch a round',
    modesTitle: 'Pick where to start',
    cta: 'Play now',
    android: 'On your phone? Get it on Google Play',
    signoff: "Ohad, who makes LexiClash. Fair warning, it's addictive.",
    footnote: "You're getting this because you just joined LexiClash.",
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
  },
  he: {
    dir: 'rtl',
    subject: (n) => `היי ${n}, במה מתחילים לשחק?`,
    preheader: 'ככה נראה סיבוב, וכל המשחקים שאפשר לשחק כבר היום.',
    kicker: 'ברוכים הבאים',
    headline: 'משחקי המילים מחכים לכם',
    greeting: (n) => `היי ${n},`,
    intro:
      'תודה שהצטרפתם ל-LexiClash. בניתי אותו בשביל מי שלא מסוגל לעבור ליד חידת מילים בלי לפתור, אז אתם בחברה טובה. כאן למטה יש הצצה לסיבוב אמיתי, ומתחתיה כל המשחקים שאפשר לקפוץ אליהם עכשיו.',
    tour: 'לחיצה כדי לראות סיבוב',
    modesTitle: 'במה מתחילים?',
    cta: 'יאללה, משחקים',
    android: 'בטלפון? להורדה מ-Google Play',
    signoff: 'אוהד, שבונה את LexiClash. ואזהרה הוגנת: זה ממכר.',
    footnote: 'קיבלתם את המייל הזה כי הרגע הצטרפתם ל-LexiClash.',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
  },
  sv: {
    dir: 'ltr',
    subject: (n) => `Hej ${n}, välj ditt första ordspel`,
    preheader: 'Så här ser en runda ut, och alla spel du kan köra redan idag.',
    kicker: 'Välkommen',
    headline: 'Dina ordspel väntar',
    greeting: (n) => `Hej ${n},`,
    intro:
      'Tack för att du gick med i LexiClash. Jag byggde det för folk som inte kan gå förbi ett ordpussel, så du är i gott sällskap. Här nedanför ser du en riktig runda, och under den alla spel du kan hoppa in i direkt.',
    tour: 'Tryck för att se en runda',
    modesTitle: 'Välj var du börjar',
    cta: 'Spela nu',
    android: 'I mobilen? Hämta på Google Play',
    signoff: 'Ohad, som gör LexiClash. Varning: det är beroendeframkallande.',
    footnote: 'Du får det här mejlet för att du precis gick med i LexiClash.',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
  },
  ja: {
    dir: 'ltr',
    subject: (n) => `${n}さん、最初に遊ぶゲームを選びましょう`,
    preheader: '実際のプレイ画面と、今日から遊べるゲームをまとめました。',
    kicker: 'ようこそ',
    headline: '言葉のゲームが待っています',
    greeting: (n) => `${n}さん、こんにちは。`,
    intro:
      'LexiClashに登録してくださり、ありがとうございます。言葉のパズルを見ると解かずにいられない人のために作ったゲームです。下に実際のプレイの様子と、今すぐ遊べるゲームの一覧を載せました。',
    tour: 'タップしてプレイを見る',
    modesTitle: 'どれから始めますか',
    cta: '今すぐ遊ぶ',
    android: 'スマホで遊ぶなら Google Playで入手',
    signoff: 'LexiClash開発者のOhadより。ハマりやすいのでご注意ください。',
    footnote: 'LexiClashにご登録いただいたため、このメールをお送りしています。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
  },
  es: {
    dir: 'ltr',
    subject: (n) => `Hola ${n}, elige tu primer juego de palabras`,
    preheader: 'Así se ve una partida, y todos los juegos que puedes probar hoy.',
    kicker: 'Ya estás dentro',
    headline: 'Tus juegos de palabras te esperan',
    greeting: (n) => `Hola ${n}:`,
    intro:
      'Gracias por unirte a LexiClash. Lo hice para la gente que no puede pasar de largo ante un pasatiempo de palabras, así que estás en buena compañía. Aquí abajo tienes una partida real y, debajo, todos los juegos en los que puedes entrar ahora mismo.',
    tour: 'Toca para ver una partida',
    modesTitle: 'Elige por dónde empezar',
    cta: 'Jugar ya',
    android: '¿En el móvil? Descárgalo en Google Play',
    signoff: 'Ohad, el creador de LexiClash. Aviso: engancha.',
    footnote: 'Recibes este correo porque acabas de unirte a LexiClash.',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
  },
  ru: {
    dir: 'ltr',
    subject: (n) => `Привет, ${n}! С какой игры начнёшь?`,
    preheader: 'Как выглядит раунд и во что можно сыграть уже сегодня.',
    kicker: 'Добро пожаловать',
    headline: 'Словесные игры уже ждут',
    greeting: (n) => `Привет, ${n}!`,
    intro:
      'Спасибо, что ты теперь с нами в LexiClash. Я сделал её для тех, кто не может пройти мимо словесной головоломки, так что ты в хорошей компании. Ниже настоящий раунд, а под ним все игры, в которые можно зайти прямо сейчас.',
    tour: 'Нажми, чтобы посмотреть раунд',
    modesTitle: 'С чего начать',
    cta: 'Играть',
    android: 'С телефона? Скачай в Google Play',
    signoff: 'Охад, автор LexiClash. Предупреждаю: затягивает.',
    footnote: 'Это письмо пришло после твоей регистрации в LexiClash.',
    unsubscribe: 'Отписаться',
    privacy: 'Конфиденциальность',
  },
};
