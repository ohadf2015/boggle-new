import type { TeacherLocale } from '@/lib/education/types';
import type { ActivationNudgeBucket } from '@/lib/education/activationNudge';
import { renderNeoEmail, type NeoAccent, type NeoArt, type NeoBlock } from '@/lib/email/kit/neoEmail';
import { firstName, TEACHER_EMAIL_REPLY_TO, teacherEmailUrl } from './teacherEmailLayout';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  bucket: ActivationNudgeBucket;
}

interface BucketCopy {
  subject: string;
  preheader: string;
  headline: string;
  lead: string;
  blocks: NeoBlock[];
  cta: string;
}

interface Copy {
  kicker: string;
  greeting: (n: string) => string;
  buckets: Record<ActivationNudgeBucket, BucketCopy>;
  signoff: string;
  footnote: string;
  dir: 'ltr' | 'rtl';
}

const LOOK: Record<ActivationNudgeBucket, { accent: NeoAccent; art: NeoArt }> = {
  d1: { accent: 'cyan', art: 'projector' },
  d3: { accent: 'purple', art: 'streak' },
  d7: { accent: 'pink', art: 'miss-you' },
};

// Day-3 copy quotes the lobby button (education.projectorLobby.practiceFirst) verbatim per locale.
const COPY: Record<TeacherLocale, Copy> = {
  en: {
    kicker: 'Teacher setup',
    greeting: (n) => `Hi ${n},`,
    buckets: {
      d1: {
        subject: 'Your LexiClash class takes about a minute to set up',
        preheader: 'Name it, put the code on the board, and your students are in.',
        headline: 'Your class is one name away',
        lead: "Your teacher account is ready, but there's no class in it yet.",
        blocks: [
          { type: 'steps', items: ['Give your class a name. Anything works.', 'Put the join code on the board.', "Students type it on a phone or laptop and they're in."] },
        ],
        cta: 'Create my first class',
      },
      d3: {
        subject: 'Want a test run before your students see it?',
        preheader: 'Play a real round alone on the big screen first.',
        headline: 'Rehearse with 3 bots first',
        lead: "If you'd like to see a round before your class does, you can play one on your own.",
        blocks: [
          { type: 'callout', title: 'In the lobby, press', text: '“Practice first with 3 bots”' },
          { type: 'p', text: "It's a real round on the big screen. The bots leave as soon as your first student joins, so nothing changes for the class." },
        ],
        cta: 'Make a class and practice',
      },
      d7: {
        subject: 'Your LexiClash class is still empty',
        preheader: 'One class and one join code, and they can play today.',
        headline: 'Your first class is still empty',
        lead: 'Your teacher access is still open. One class and one join code is all your students need to play today.',
        blocks: [{ type: 'p', text: "If something got in the way, hit reply and tell me what it was. I read every answer and I'll fix what I can." }],
        cta: 'Set up my class',
      },
    },
    signoff: 'Ohad, who built LexiClash. Replies come straight to me.',
    footnote: 'You get this because you signed up as a teacher on LexiClash.',
    dir: 'ltr',
  },
  he: {
    kicker: 'הקמת כיתה',
    greeting: (n) => `היי ${n},`,
    buckets: {
      d1: {
        subject: 'הקמת כיתה ב-LexiClash לוקחת בערך דקה',
        preheader: 'נותנים שם, כותבים את הקוד על הלוח, והתלמידים בפנים.',
        headline: 'הכיתה שלך מחכה רק לשם',
        lead: 'חשבון המורה שלך מוכן, אבל עוד אין בו כיתה.',
        blocks: [
          { type: 'steps', items: ['נותנים לכיתה שם. כל שם עובד.', 'כותבים את קוד ההצטרפות על הלוח.', 'התלמידים מקלידים אותו בטלפון או במחשב ונכנסים.'] },
        ],
        cta: 'ליצור את הכיתה הראשונה',
      },
      d3: {
        subject: 'רוצה סיבוב ניסיון לפני שהתלמידים רואים?',
        preheader: 'משחקים סיבוב אמיתי לבד על המסך הגדול.',
        headline: 'חזרה גנרלית עם 3 בוטים',
        lead: 'אם בא לך לראות סיבוב לפני שהכיתה רואה, אפשר לשחק אחד לבד.',
        blocks: [
          { type: 'callout', title: 'בלובי לוחצים על', text: '"קודם תתרגלו עם 3 בוטים"' },
          { type: 'p', text: 'זה סיבוב אמיתי על המסך הגדול. הבוטים יוצאים ברגע שהתלמיד הראשון נכנס, כך שבשביל הכיתה שום דבר לא משתנה.' },
        ],
        cta: 'ליצור כיתה ולתרגל',
      },
      d7: {
        subject: 'הכיתה שלך ב-LexiClash עדיין ריקה',
        preheader: 'כיתה אחת וקוד אחד, והם משחקים כבר היום.',
        headline: 'הכיתה הראשונה עדיין ריקה',
        lead: 'גישת המורה שלך עדיין פתוחה. כיתה אחת וקוד הצטרפות אחד, וזה כל מה שהתלמידים צריכים כדי לשחק היום.',
        blocks: [{ type: 'p', text: 'אם משהו עצר אותך, אפשר פשוט להשיב למייל ולספר לי מה. אני קורא כל תשובה ומתקן מה שאפשר.' }],
        cta: 'להקים את הכיתה',
      },
    },
    signoff: 'אוהד, שבנה את LexiClash. תשובות למייל מגיעות ישר אליי.',
    footnote: 'המייל הזה נשלח כי נרשמת כמורה ב-LexiClash.',
    dir: 'rtl',
  },
  sv: {
    kicker: 'Kom igång',
    greeting: (n) => `Hej ${n},`,
    buckets: {
      d1: {
        subject: 'Din LexiClash-klass tar ungefär en minut att skapa',
        preheader: 'Ge den ett namn, skriv koden på tavlan, så är eleverna med.',
        headline: 'Din klass behöver bara ett namn',
        lead: 'Ditt lärarkonto är klart, men det finns ingen klass i det än.',
        blocks: [
          { type: 'steps', items: ['Ge klassen ett namn. Vad som helst går bra.', 'Skriv anslutningskoden på tavlan.', 'Eleverna skriver in den på mobil eller dator och är med.'] },
        ],
        cta: 'Skapa min första klass',
      },
      d3: {
        subject: 'Vill du provköra innan eleverna ser det?',
        preheader: 'Spela en riktig runda själv på storbildsskärmen först.',
        headline: 'Repetera med 3 bottar först',
        lead: 'Vill du se en runda innan klassen gör det kan du spela en på egen hand.',
        blocks: [
          { type: 'callout', title: 'Tryck i lobbyn på', text: '”Öva först med 3 bottar”' },
          { type: 'p', text: 'Det är en riktig runda på storbildsskärmen. Bottarna går så fort den första eleven ansluter, så för klassen ändras ingenting.' },
        ],
        cta: 'Skapa en klass och öva',
      },
      d7: {
        subject: 'Din LexiClash-klass är fortfarande tom',
        preheader: 'En klass och en kod, så kan de spela i dag.',
        headline: 'Din första klass är fortfarande tom',
        lead: 'Din lärarbehörighet är fortfarande öppen. En klass och en anslutningskod är allt eleverna behöver för att spela i dag.',
        blocks: [{ type: 'p', text: 'Om något kom emellan, svara på mejlet och berätta vad. Jag läser varje svar och fixar det jag kan.' }],
        cta: 'Skapa min klass',
      },
    },
    signoff: 'Ohad, som byggde LexiClash. Svar hamnar direkt hos mig.',
    footnote: 'Du får det här för att du registrerade dig som lärare på LexiClash.',
    dir: 'ltr',
  },
  ja: {
    kicker: 'クラスの準備',
    greeting: (n) => `${n}様`,
    buckets: {
      d1: {
        subject: 'LexiClashのクラスは1分ほどで作れます',
        preheader: '名前を付けて、コードを黒板に書けば生徒が参加できます。',
        headline: 'あとはクラス名を入れるだけ',
        lead: '教師アカウントの準備はできていますが、まだクラスがありません。',
        blocks: [
          { type: 'steps', items: ['クラスに名前を付けます。どんな名前でも大丈夫です。', '参加コードを黒板に書きます。', '生徒がスマホやパソコンでコードを入力すれば参加完了です。'] },
        ],
        cta: '最初のクラスを作る',
      },
      d3: {
        subject: '生徒に見せる前に、試しに遊んでみませんか',
        preheader: 'まずは一人で、大画面で本番どおりのラウンドを。',
        headline: 'まずボット3人とリハーサル',
        lead: 'クラスで使う前に様子を見たい場合は、一人で1ラウンド遊べます。',
        blocks: [
          { type: 'callout', title: 'ロビーで押すボタン', text: '「まずボット3人で練習」' },
          { type: 'p', text: '大画面で本番と同じラウンドを遊べます。最初の生徒が参加した時点でボットは退出するので、クラスへの影響はありません。' },
        ],
        cta: 'クラスを作って練習する',
      },
      d7: {
        subject: 'LexiClashのクラスはまだ空のままです',
        preheader: 'クラスと参加コードがひとつあれば、今日から遊べます。',
        headline: '最初のクラスがまだ空です',
        lead: '教師アクセスはまだ有効です。クラスと参加コードがひとつあれば、生徒は今日から遊べます。',
        blocks: [{ type: 'p', text: '何かつまずいたことがあれば、このメールに返信して教えてください。返信はすべて読み、直せるところは直します。' }],
        cta: 'クラスを設定する',
      },
    },
    signoff: 'Ohad（LexiClash作者）より。返信は私に直接届きます。',
    footnote: 'LexiClashに教師として登録された方にお送りしています。',
    dir: 'ltr',
  },
  es: {
    kicker: 'Tu clase',
    greeting: (n) => `Hola ${n}:`,
    buckets: {
      d1: {
        subject: 'Crear tu clase de LexiClash lleva un minuto',
        preheader: 'Ponle nombre, escribe el código en la pizarra y ya están dentro.',
        headline: 'A tu clase solo le falta un nombre',
        lead: 'Tu cuenta de profesor está lista, pero todavía no tiene ninguna clase.',
        blocks: [
          { type: 'steps', items: ['Ponle un nombre a la clase. Vale cualquiera.', 'Escribe el código de acceso en la pizarra.', 'Tus estudiantes lo escriben en el móvil o el ordenador y ya están dentro.'] },
        ],
        cta: 'Crear mi primera clase',
      },
      d3: {
        subject: '¿Quieres probarlo antes de que lo vea tu clase?',
        preheader: 'Juega una ronda real tú solo en la pantalla grande.',
        headline: 'Ensaya primero con 3 bots',
        lead: 'Si quieres ver una ronda antes que tu clase, puedes jugar una tú solo.',
        blocks: [
          { type: 'callout', title: 'En la sala de espera, pulsa', text: '«Practica primero con 3 bots»' },
          { type: 'p', text: 'Es una ronda real en la pantalla grande. Los bots se van en cuanto entra tu primer estudiante, así que para la clase no cambia nada.' },
        ],
        cta: 'Crear una clase y practicar',
      },
      d7: {
        subject: 'Tu clase de LexiClash sigue vacía',
        preheader: 'Una clase y un código, y pueden jugar hoy mismo.',
        headline: 'Tu primera clase sigue vacía',
        lead: 'Tu acceso de profesor sigue abierto. Una clase y un código de acceso es todo lo que tus estudiantes necesitan para jugar hoy.',
        blocks: [{ type: 'p', text: 'Si algo te frenó, responde a este correo y cuéntame qué fue. Leo todas las respuestas y arreglo lo que puedo.' }],
        cta: 'Configurar mi clase',
      },
    },
    signoff: 'Ohad, quien creó LexiClash. Las respuestas me llegan directamente.',
    footnote: 'Recibes esto porque te registraste como profesor en LexiClash.',
    dir: 'ltr',
  },
  ru: {
    kicker: 'Ваш класс',
    greeting: (n) => `Здравствуйте, ${n}!`,
    buckets: {
      d1: {
        subject: 'Класс в LexiClash создаётся примерно за минуту',
        preheader: 'Назовите класс, напишите код на доске, и ученики уже в игре.',
        headline: 'Классу не хватает только названия',
        lead: 'Ваш аккаунт учителя готов, но класса в нём пока нет.',
        blocks: [
          { type: 'steps', items: ['Назовите класс. Подойдёт любое название.', 'Напишите код для входа на доске.', 'Ученики вводят его на телефоне или ноутбуке и сразу подключаются.'] },
        ],
        cta: 'Создать первый класс',
      },
      d3: {
        subject: 'Хотите попробовать до того, как увидят ученики?',
        preheader: 'Сыграйте настоящий раунд сами на большом экране.',
        headline: 'Сначала репетиция с 3 ботами',
        lead: 'Если хотите увидеть раунд раньше класса, можно сыграть его самостоятельно.',
        blocks: [
          { type: 'callout', title: 'В лобби нажмите', text: '«Сначала потренируйтесь с 3 ботами»' },
          { type: 'p', text: 'Это настоящий раунд на большом экране. Боты уходят, как только заходит первый ученик, так что для класса ничего не меняется.' },
        ],
        cta: 'Создать класс и потренироваться',
      },
      d7: {
        subject: 'Ваш класс в LexiClash всё ещё пуст',
        preheader: 'Один класс и один код, и ученики играют уже сегодня.',
        headline: 'Первый класс всё ещё пуст',
        lead: 'Ваш доступ учителя всё ещё открыт. Одного класса и одного кода достаточно, чтобы ученики сыграли уже сегодня.',
        blocks: [{ type: 'p', text: 'Если что-то помешало, ответьте на это письмо и расскажите, что именно. Я читаю каждый ответ и исправляю, что могу.' }],
        cta: 'Настроить мой класс',
      },
    },
    signoff: 'Охад, автор LexiClash. Ответы приходят прямо мне.',
    footnote: 'Вы получили это письмо, потому что зарегистрировались в LexiClash как учитель.',
    dir: 'ltr',
  },
};

export function teacherActivationNudge({ full_name, locale, bucket }: Args) {
  const c = COPY[locale] || COPY.en;
  const b = c.buckets[bucket];
  const html = renderNeoEmail({
    lang: locale,
    dir: c.dir,
    preheader: b.preheader,
    ...LOOK[bucket],
    kicker: c.kicker,
    headline: b.headline,
    greeting: c.greeting(firstName(full_name) || full_name),
    blocks: [{ type: 'p', text: b.lead, strong: true }, ...b.blocks],
    cta: { label: b.cta, href: teacherEmailUrl(locale, '/teacher/classroom/new', `edu_activation_${bucket}`) },
    signoff: c.signoff,
    footnote: c.footnote,
  });
  return { subject: b.subject, html, replyTo: TEACHER_EMAIL_REPLY_TO };
}
