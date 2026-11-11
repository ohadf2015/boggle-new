import type { TeacherLocale } from '@/lib/education/types';
import { formatLessonTime } from '@/lib/education/lessonPlan';
import { SESSION_TEMPLATES, sessionHostHref, sessionPackThemes } from '@/lib/education/sessionTemplates';
import { isPackLanguage, themedPackCode } from '@/lib/education/themedPacks';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';
import { TEACHER_EMAIL_REPLY_TO, firstName, teacherEmailUrl } from './teacherEmailLayout';

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
  preheader: (when: string, code: string) => string;
  tagline: string;
  headline: string;
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
    preheader: (when, code) => `Class starts ${when}. Join code ${code}, and the game is one tap away.`,
    tagline: 'For teachers',
    headline: 'Your warm-up is ready',
    greeting: (n) => (n ? `Hi ${n},` : 'Hi there,'),
    lead: (cls, when) => `${cls} starts ${when}. Your 5-minute warm-up is ready.`,
    board: 'Put this code on the board. Students type it on a phone or laptop and they are in, no account needed.',
    cta: 'Open the game',
    secondary: 'Open my class',
    signoff: 'Have a good lesson! Ohad from LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: (cls) => `משחק החימום של ${cls} מוכן`,
    preheader: (when, code) => `השיעור מתחיל ב${when}. קוד ההצטרפות ${code}, והמשחק במרחק לחיצה.`,
    tagline: 'למורים',
    headline: 'משחק החימום מוכן',
    greeting: (n) => (n ? `היי ${n},` : 'היי,'),
    lead: (cls, when) => `השיעור עם ${cls} מתחיל ב${when}. משחק חימום של 5 דקות כבר מחכה.`,
    board: 'כותבים את הקוד הזה על הלוח. התלמידים מקלידים אותו בטלפון או במחשב ונכנסים, בלי להירשם.',
    cta: 'לפתוח את המשחק',
    secondary: 'לכיתה שלי',
    signoff: 'שיעור מוצלח! אוהד מ-LexiClash',
    dir: 'rtl',
  },
  es: {
    subject: (cls) => `Tu calentamiento para ${cls} ya está listo`,
    preheader: (when, code) => `La clase empieza el ${when}. Código ${code}, y el juego está a un toque.`,
    tagline: 'Para docentes',
    headline: 'Tu calentamiento está listo',
    greeting: (n) => (n ? `Hola, ${n}:` : 'Hola:'),
    lead: (cls, when) => `${cls} empieza el ${when}. Tu calentamiento de 5 minutos ya está listo.`,
    board: 'Escribe este código en la pizarra. Tus alumnos lo meten en el móvil o el portátil y ya están dentro, sin crear cuenta.',
    cta: 'Abrir el juego',
    secondary: 'Ir a mi clase',
    signoff: '¡Que vaya muy bien la clase! Ohad, de LexiClash',
    dir: 'ltr',
  },
  sv: {
    subject: (cls) => `Uppvärmningen för ${cls} är klar`,
    preheader: (when, code) => `Lektionsstart: ${when}. Kod ${code}, och spelet är ett tryck bort.`,
    tagline: 'För lärare',
    headline: 'Uppvärmningen ligger redo',
    greeting: (n) => (n ? `Hej ${n},` : 'Hej,'),
    lead: (cls, when) => `Nästa lektion med ${cls}: ${when}. Din uppvärmning på 5 minuter ligger redo.`,
    board: 'Skriv den här koden på tavlan. Eleverna skriver in den i mobilen eller datorn och är med direkt, utan konto.',
    cta: 'Öppna spelet',
    secondary: 'Öppna min klass',
    signoff: 'Lycka till på lektionen! Ohad på LexiClash',
    dir: 'ltr',
  },
  ja: {
    subject: (cls) => `${cls}のウォームアップを用意しました`,
    preheader: (when, code) => `授業は${when}。参加コードは${code}、ゲームはワンタップで始められます。`,
    tagline: '先生向け',
    headline: 'ウォームアップの準備完了',
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
    preheader: (when, code) => `Начало урока: ${when}. Код ${code}, игра откроется в одно касание.`,
    tagline: 'Для учителей',
    headline: 'Разминка уже готова',
    greeting: (n) => (n ? `Здравствуйте, ${n}!` : 'Здравствуйте!'),
    lead: (cls, when) => `${cls}, начало урока: ${when}. Пятиминутная разминка уже готова.`,
    board: 'Напишите этот код на доске. Ученики вводят его на телефоне или ноутбуке и сразу попадают в игру, без регистрации.',
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

  const html = renderNeoEmail({
    lang,
    dir: c.dir,
    preheader: c.preheader(when, joinCode),
    accent: 'lime',
    art: 'projector',
    kicker: c.tagline,
    headline: c.headline,
    greeting: c.greeting(firstName(fullName)),
    blocks: [
      { type: 'p', text: c.lead(className, when), strong: true },
      { type: 'p', text: c.board },
      { type: 'tiles', word: joinCode },
    ],
    cta: { label: c.cta, href: lessonReminderGameUrl(lang, classroomId, boardLanguage) },
    secondary: { label: c.secondary, href: teacherEmailUrl(lang, '/teacher', 'lesson_reminder') },
    signoff: c.signoff,
  });

  return { subject: c.subject(className), html, replyTo: TEACHER_EMAIL_REPLY_TO };
}
