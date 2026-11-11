import type { TeacherLocale } from '@/lib/education/types';
import { formatLessonTime } from '@/lib/education/lessonPlan';
import { SESSION_TEMPLATES, sessionHostHref, sessionPackThemes } from '@/lib/education/sessionTemplates';
import { isPackLanguage, themedPackCode } from '@/lib/education/themedPacks';
import { TEACHER_EMAIL_REPLY_TO, firstName, renderTeacherEmail, teacherEmailUrl } from './teacherEmailLayout';

interface Args {
  fullName: string | null;
  locale: TeacherLocale;
  className: string;
  joinCode: string;
  classroomId: string;
  boardLanguage: string | null;
  lessonAt: string;
  timezone: string | null;
}

interface Copy {
  subject: (cls: string) => string;
  preheader: (when: string) => string;
  tagline: string;
  greeting: (n: string) => string;
  lead: (cls: string, when: string) => string;
  board: string;
  cta: string;
  secondary: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: (cls) => `Your warm-up for ${cls} is ready`,
    preheader: (when) => `Class starts ${when}. The game is one tap away.`,
    tagline: 'For teachers',
    greeting: (n) => (n ? `Hi ${n},` : 'Hi there,'),
    lead: (cls, when) => `${cls} starts ${when}. Your 5-minute warm-up is ready.`,
    board: 'Put this code on the board. Students type it on their phone or laptop and they are in, no account needed:',
    cta: 'Open the game',
    secondary: 'Open my class',
    signoff: 'Have a good lesson! Ohad from LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: (cls) => `משחק החימום של ${cls} מוכן`,
    preheader: (when) => `השיעור מתחיל ב${when}. המשחק במרחק לחיצה.`,
    tagline: 'למורים',
    greeting: (n) => (n ? `היי ${n},` : 'היי,'),
    lead: (cls, when) => `השיעור עם ${cls} מתחיל ב${when}. משחק חימום של 5 דקות כבר מחכה לך.`,
    board: 'כדאי לכתוב את הקוד הזה על הלוח. התלמידים מקלידים אותו בטלפון או במחשב ונכנסים, בלי להירשם:',
    cta: 'פתיחת המשחק',
    secondary: 'לכיתה שלי',
    signoff: 'שיעור מוצלח! אוהד מ-LexiClash',
    dir: 'rtl',
  },
  es: {
    subject: (cls) => `Tu calentamiento para ${cls} ya está listo`,
    preheader: (when) => `La clase empieza el ${when}. El juego está a un toque.`,
    tagline: 'Para docentes',
    greeting: (n) => (n ? `Hola, ${n}:` : 'Hola:'),
    lead: (cls, when) => `${cls} empieza el ${when}. Tu calentamiento de 5 minutos ya está listo.`,
    board: 'Escribe este código en la pizarra. Tus alumnos lo meten en el móvil o el portátil y ya están dentro, sin crear cuenta:',
    cta: 'Abrir el juego',
    secondary: 'Ir a mi clase',
    signoff: '¡Que vaya muy bien la clase! Ohad, de LexiClash',
    dir: 'ltr',
  },
  sv: {
    subject: (cls) => `Uppvärmningen för ${cls} är klar`,
    preheader: (when) => `Lektionsstart: ${when}. Spelet är ett tryck bort.`,
    tagline: 'För lärare',
    greeting: (n) => (n ? `Hej ${n},` : 'Hej,'),
    lead: (cls, when) => `Nästa lektion med ${cls}: ${when}. Din uppvärmning på 5 minuter ligger redo.`,
    board: 'Skriv den här koden på tavlan. Eleverna skriver in den i mobilen eller datorn och är med direkt, utan konto:',
    cta: 'Öppna spelet',
    secondary: 'Öppna min klass',
    signoff: 'Lycka till på lektionen! Ohad på LexiClash',
    dir: 'ltr',
  },
  ja: {
    subject: (cls) => `${cls}のウォームアップを用意しました`,
    preheader: (when) => `授業は${when}。ゲームはワンタップで始められます。`,
    tagline: '先生向け',
    greeting: (n) => (n ? `${n}さん、こんにちは。` : 'こんにちは。'),
    lead: (cls, when) => `${cls}の授業は${when}からですね。5分のウォームアップを準備しておきました。`,
    board: 'このコードを黒板に書いてください。生徒はスマホやパソコンで入力するだけで参加できます。アカウントは不要です。',
    cta: 'ゲームを開く',
    secondary: 'クラスを開く',
    signoff: '良い授業を！ LexiClashのOhadより',
    dir: 'ltr',
  },
  ru: {
    subject: (cls) => `Разминка готова: ${cls}`,
    preheader: (when) => `Начало урока: ${when}. Игра откроется в одно касание.`,
    tagline: 'Для учителей',
    greeting: (n) => (n ? `Здравствуйте, ${n}!` : 'Здравствуйте!'),
    lead: (cls, when) => `${cls}, начало урока: ${when}. Пятиминутная разминка уже готова.`,
    board: 'Напишите этот код на доске. Ученики вводят его на телефоне или ноутбуке и сразу попадают в игру, без регистрации:',
    cta: 'Открыть игру',
    secondary: 'Открыть мой класс',
    signoff: 'Хорошего урока! Охад из LexiClash',
    dir: 'ltr',
  },
};

const WARM_UP = SESSION_TEMPLATES.find((s) => s.id === 'warm-up')!;

export function lessonReminderGameUrl(locale: TeacherLocale, classroomId: string, boardLanguage: string | null, now = new Date()): string {
  const lang = isPackLanguage(boardLanguage) ? boardLanguage : null;
  const theme = lang ? sessionPackThemes(WARM_UP, lang, now)[0] : undefined;
  const packCode = lang && theme ? themedPackCode(lang, theme) : null;
  const query = sessionHostHref(locale, WARM_UP, packCode, classroomId).split('?')[1] ?? '';
  return teacherEmailUrl(locale, '/education/classroom-game', 'lesson_reminder', Object.fromEntries(new URLSearchParams(query)));
}

export function teacherLessonReminder({ fullName, locale, className, joinCode, classroomId, boardLanguage, lessonAt, timezone }: Args) {
  const lang: TeacherLocale = COPY[locale] ? locale : 'en';
  const c = COPY[lang];
  const when = formatLessonTime(new Date(lessonAt), timezone, lang);

  const html = renderTeacherEmail({
    lang,
    dir: c.dir,
    preheader: c.preheader(when),
    tagline: c.tagline,
    greeting: c.greeting(firstName(fullName)),
    lead: c.lead(className, when),
    paragraphs: [c.board],
    code: joinCode,
    cta: { label: c.cta, href: lessonReminderGameUrl(lang, classroomId, boardLanguage) },
    secondary: { label: c.secondary, href: teacherEmailUrl(lang, '/teacher', 'lesson_reminder') },
    signoff: c.signoff,
  });

  return { subject: c.subject(className), html, replyTo: TEACHER_EMAIL_REPLY_TO };
}
