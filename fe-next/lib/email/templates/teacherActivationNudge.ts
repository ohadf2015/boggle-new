import type { TeacherLocale } from '@/lib/education/types';
import type { ActivationNudgeBucket } from '@/lib/education/activationNudge';

interface Args {
  full_name: string;
  locale: TeacherLocale;
  bucket: ActivationNudgeBucket;
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const SITE = 'https://www.lexiclash.live';
const CONTACT = 'ohadf2015@gmail.com';

interface BucketCopy {
  subject: string;
  lead: string;
  body: string;
  cta: string;
}

interface Copy {
  greeting: (n: string) => string;
  buckets: Record<ActivationNudgeBucket, BucketCopy>;
  ask: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

// Day-3 copy quotes the lobby button (education.projectorLobby.practiceFirst) verbatim per locale.
const COPY: Record<TeacherLocale, Copy> = {
  en: {
    greeting: (n) => `Hi ${n},`,
    buckets: {
      d1: {
        subject: 'Your LexiClash class is one minute away',
        lead: "Your teacher access is live, but you haven't made a class yet.",
        body: 'Give it a name and you get a join code. Students type it on any phone or laptop and they are in.',
        cta: 'Create my first class',
      },
      d3: {
        subject: 'Try LexiClash with 3 bots before your students join',
        lead: 'Not sure what your class will see? Rehearse it alone first.',
        body: 'Make your class, open the lobby and press “Practice first with 3 bots”. You play a real round on the big screen, and the bots leave the moment your first student joins.',
        cta: 'Make a class and practice',
      },
      d7: {
        subject: 'Your LexiClash classroom is still waiting',
        lead: 'Your teacher access is still open, and your first class is still empty.',
        body: 'One class and one join code is all it takes for your students to play today. If something got in the way, reply and tell me what it was.',
        cta: 'Set up my class',
      },
    },
    ask: `Questions? Write me directly: ${CONTACT}. I read everything.`,
    signoff: '— Ohad, the creator of LexiClash',
    dir: 'ltr',
  },
  he: {
    greeting: (n) => `שלום ${n},`,
    buckets: {
      d1: {
        subject: 'הכיתה שלך ב-LexiClash במרחק דקה',
        lead: 'הגישה שלך כמורה פעילה, אבל עדיין לא יצרת כיתה.',
        body: 'נותנים לכיתה שם ומקבלים קוד הצטרפות. התלמידים מקלידים אותו בכל טלפון או מחשב ונכנסים.',
        cta: 'ליצור את הכיתה הראשונה שלי',
      },
      d3: {
        subject: 'נסו את LexiClash עם 3 בוטים לפני שהתלמידים מצטרפים',
        lead: 'לא בטוח/ה מה הכיתה תראה? אפשר לעשות חזרה לבד קודם.',
        body: 'יוצרים כיתה, פותחים את הלובי ולוחצים על "קודם תתרגלו עם 3 בוטים". משחקים סיבוב אמיתי על המסך הגדול, והבוטים יוצאים ברגע שהתלמיד הראשון נכנס.',
        cta: 'ליצור כיתה ולתרגל',
      },
      d7: {
        subject: 'הכיתה שלך ב-LexiClash עדיין מחכה',
        lead: 'הגישה שלך כמורה עדיין פתוחה, והכיתה הראשונה עדיין ריקה.',
        body: 'כיתה אחת וקוד הצטרפות אחד, וזהו: התלמידים יכולים לשחק כבר היום. אם משהו הפריע, השב/י למייל הזה וספר/י לי מה.',
        cta: 'להקים את הכיתה שלי',
      },
    },
    ask: `שאלות? כתוב/י לי ישירות: ${CONTACT}. אני קורא הכל.`,
    signoff: '— אוהד, היוצר של LexiClash',
    dir: 'rtl',
  },
  sv: {
    greeting: (n) => `Hej ${n},`,
    buckets: {
      d1: {
        subject: 'Din LexiClash-klass är en minut bort',
        lead: 'Din lärarbehörighet är aktiv, men du har inte skapat någon klass än.',
        body: 'Ge klassen ett namn så får du en kod. Eleverna skriver in den på valfri mobil eller dator och är med.',
        cta: 'Skapa min första klass',
      },
      d3: {
        subject: 'Testa LexiClash med 3 bottar innan eleverna ansluter',
        lead: 'Osäker på vad klassen kommer att se? Öva själv först.',
        body: 'Skapa din klass, öppna lobbyn och tryck på ”Öva först med 3 bottar”. Du spelar en riktig runda på storbildsskärmen, och bottarna lämnar så fort den första eleven ansluter.',
        cta: 'Skapa en klass och öva',
      },
      d7: {
        subject: 'Ditt LexiClash-klassrum väntar fortfarande',
        lead: 'Din lärarbehörighet är fortfarande öppen, och din första klass är fortfarande tom.',
        body: 'En klass och en kod räcker för att eleverna ska kunna spela i dag. Om något kom emellan, svara och berätta vad.',
        cta: 'Skapa min klass',
      },
    },
    ask: `Frågor? Skriv direkt till mig: ${CONTACT}. Jag läser allt.`,
    signoff: '— Ohad, skaparen av LexiClash',
    dir: 'ltr',
  },
  ja: {
    greeting: (n) => `${n}様、`,
    buckets: {
      d1: {
        subject: 'LexiClashのクラスは1分で作れます',
        lead: '教師アクセスは有効ですが、まだクラスがありません。',
        body: 'クラス名を入れるだけで参加コードが発行されます。生徒はスマホやパソコンでコードを入力すれば参加できます。',
        cta: '最初のクラスを作る',
      },
      d3: {
        subject: '生徒が参加する前に、ボット3人でLexiClashを試してみませんか',
        lead: 'クラスでどう見えるか不安なら、まず一人でリハーサルできます。',
        body: 'クラスを作ってロビーを開き、「まずボット3人で練習」を押してください。大画面で本番と同じラウンドを遊べて、最初の生徒が参加した時点でボットは退出します。',
        cta: 'クラスを作って練習する',
      },
      d7: {
        subject: 'LexiClashの教室がまだお待ちしています',
        lead: '教師アクセスはまだ有効で、最初のクラスはまだ空のままです。',
        body: 'クラスと参加コードがひとつあれば、生徒は今日から遊べます。何か困ったことがあれば、このメールに返信して教えてください。',
        cta: 'クラスを設定する',
      },
    },
    ask: `ご質問は ${CONTACT} まで直接どうぞ。すべて読んでいます。`,
    signoff: '— Ohad（LexiClash作者）',
    dir: 'ltr',
  },
  es: {
    greeting: (n) => `Hola ${n},`,
    buckets: {
      d1: {
        subject: 'Tu clase de LexiClash está a un minuto',
        lead: 'Tu acceso de profesor está activo, pero todavía no has creado una clase.',
        body: 'Ponle un nombre y recibes un código. Tus estudiantes lo escriben en cualquier móvil u ordenador y ya están dentro.',
        cta: 'Crear mi primera clase',
      },
      d3: {
        subject: 'Prueba LexiClash con 3 bots antes de que entren tus estudiantes',
        lead: '¿No sabes qué verá tu clase? Ensáyalo tú primero.',
        body: 'Crea tu clase, abre la sala de espera y pulsa «Practica primero con 3 bots». Juegas una ronda real en la pantalla grande, y los bots se van en cuanto entra tu primer estudiante.',
        cta: 'Crear una clase y practicar',
      },
      d7: {
        subject: 'Tu aula de LexiClash sigue esperando',
        lead: 'Tu acceso de profesor sigue abierto y tu primera clase sigue vacía.',
        body: 'Con una clase y un código tus estudiantes pueden jugar hoy mismo. Si algo te frenó, responde y cuéntame qué fue.',
        cta: 'Configurar mi clase',
      },
    },
    ask: `¿Preguntas? Escríbeme directamente: ${CONTACT}. Lo leo todo.`,
    signoff: '— Ohad, el creador de LexiClash',
    dir: 'ltr',
  },
  ru: {
    greeting: (n) => `Здравствуйте, ${n}!`,
    buckets: {
      d1: {
        subject: 'До вашего класса в LexiClash одна минута',
        lead: 'Ваш доступ учителя активен, но класса пока нет.',
        body: 'Дайте классу название и получите код. Ученики вводят его на любом телефоне или ноутбуке и сразу подключаются.',
        cta: 'Создать первый класс',
      },
      d3: {
        subject: 'Попробуйте LexiClash с 3 ботами до прихода учеников',
        lead: 'Не уверены, что увидит класс? Сначала отрепетируйте сами.',
        body: 'Создайте класс, откройте лобби и нажмите «Сначала потренируйтесь с 3 ботами». Вы сыграете настоящий раунд на большом экране, а боты уйдут, как только зайдёт первый ученик.',
        cta: 'Создать класс и потренироваться',
      },
      d7: {
        subject: 'Ваш класс в LexiClash всё ещё ждёт',
        lead: 'Ваш доступ учителя всё ещё открыт, а первый класс всё ещё пуст.',
        body: 'Одного класса и одного кода достаточно, чтобы ученики сыграли уже сегодня. Если что-то помешало, ответьте на это письмо и расскажите.',
        cta: 'Настроить мой класс',
      },
    },
    ask: `Вопросы? Пишите мне напрямую: ${CONTACT}. Я читаю всё.`,
    signoff: '— Охад, создатель LexiClash',
    dir: 'ltr',
  },
};

export function teacherActivationNudge({ full_name, locale, bucket }: Args) {
  const c = COPY[locale] || COPY.en;
  const b = c.buckets[bucket];
  const align = c.dir === 'rtl' ? 'right' : 'left';

  const html = `<!doctype html>
<html dir="${c.dir}" lang="${locale}">
<body style="margin:0;padding:0;background:#0e1430;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:3px solid #1a1a2e;">
        <tr><td dir="${c.dir}" align="${align}" style="padding:28px 28px 8px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;text-align:${align};">
          <p style="font-size:18px;font-weight:700;margin:0 0 12px 0;">${c.greeting(escape(full_name))}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;font-weight:700;">${escape(b.lead)}</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">${escape(b.body)}</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 20px 28px;">
          <a href="${SITE}/${locale}/teacher/classroom/new" style="background:#BFFF00;color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:16px;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;border:2px solid #1a1a2e;">${escape(b.cta)}</a>
        </td></tr>
        <tr><td dir="${c.dir}" align="${align}" style="padding:0 28px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:13px;text-align:${align};">
          <p style="margin:0 0 8px 0;">${escape(c.ask)}</p>
          <p style="margin:0;">${escape(c.signoff)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: b.subject, html, replyTo: CONTACT };
}
