import type { TeacherLocale } from '@/lib/education/types';
import { renderNeoEmail } from '@/lib/email/kit/neoEmail';
import { TEACHER_EMAIL_REPLY_TO, firstName, teacherEmailUrl } from './teacherEmailLayout';

interface Args {
  fullName: string | null;
  locale: TeacherLocale;
  className: string;
  classroomId: string;
}

interface Copy {
  subject: (cls: string) => string;
  preheader: (cls: string) => string;
  tagline: string;
  headline: string;
  greeting: (n: string) => string;
  lead: (cls: string) => string;
  next: string;
  cta: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Record<TeacherLocale, Copy> = {
  en: {
    subject: (cls) => `Students are joining ${cls}`,
    preheader: (cls) => `${cls} has its first students.`,
    tagline: 'For teachers',
    headline: 'Your first students are in',
    greeting: (n) => (n ? `Hi ${n},` : 'Hi there,'),
    lead: (cls) => `Your students have started joining ${cls}.`,
    next: 'Open your class to see who is in and start a quick game while they are around.',
    cta: 'Open my class',
    signoff: 'Have a good lesson! Ohad from LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: (cls) => `התלמידים מתחילים להצטרף ל${cls}`,
    preheader: (cls) => `הכיתה ${cls} כבר לא ריקה.`,
    tagline: 'למורים',
    headline: 'ההצטרפויות הראשונות לכיתה',
    greeting: (n) => (n ? `היי ${n},` : 'היי,'),
    lead: (cls) => `התלמידים שלך התחילו להצטרף ל${cls}, והכיתה כבר לא ריקה.`,
    next: 'נכנסים לכיתה, רואים מי כבר שם, ומתחילים משחק קצר בזמן שכולם מחוברים.',
    cta: 'לכיתה שלי',
    signoff: 'שיעור מוצלח! אוהד מ-LexiClash',
    dir: 'rtl',
  },
  es: {
    subject: (cls) => `Tus alumnos ya se están uniendo a ${cls}`,
    preheader: (cls) => `${cls} ya tiene sus primeros alumnos.`,
    tagline: 'Para docentes',
    headline: 'Ya llegan tus primeros alumnos',
    greeting: (n) => (n ? `Hola, ${n}:` : 'Hola:'),
    lead: (cls) => `Tus alumnos han empezado a unirse a ${cls}.`,
    next: 'Abre tu clase para ver quién ya está dentro y empieza una partida rápida mientras siguen conectados.',
    cta: 'Ir a mi clase',
    signoff: '¡Que vaya muy bien la clase! Ohad, de LexiClash',
    dir: 'ltr',
  },
  sv: {
    subject: (cls) => `Eleverna börjar gå med i ${cls}`,
    preheader: (cls) => `${cls} har fått sina första elever.`,
    tagline: 'För lärare',
    headline: 'Dina första elever är med',
    greeting: (n) => (n ? `Hej ${n},` : 'Hej,'),
    lead: (cls) => `Dina elever har börjat gå med i ${cls}.`,
    next: 'Öppna klassen för att se vilka som är med och starta ett snabbt spel medan de är kvar.',
    cta: 'Öppna min klass',
    signoff: 'Lycka till på lektionen! Ohad på LexiClash',
    dir: 'ltr',
  },
  ja: {
    subject: (cls) => `${cls}に生徒が参加し始めています`,
    preheader: (cls) => `${cls}に最初の生徒が入りました。`,
    tagline: '先生向け',
    headline: '最初の生徒たちが参加しました',
    greeting: (n) => (n ? `${n}さん、こんにちは。` : 'こんにちは。'),
    lead: (cls) => `${cls}に、生徒が参加し始めました。`,
    next: 'クラスを開いて参加者を確認し、みんながいるうちに短いゲームを始めてみてください。',
    cta: 'クラスを開く',
    signoff: '良い授業を！ LexiClashのOhadより',
    dir: 'ltr',
  },
  ru: {
    subject: (cls) => `Ученики начали заходить в ${cls}`,
    preheader: (cls) => `В классе ${cls} появились первые ученики.`,
    tagline: 'Для учителей',
    headline: 'У вас появились первые ученики',
    greeting: (n) => (n ? `Здравствуйте, ${n}!` : 'Здравствуйте!'),
    lead: (cls) => `Ученики начали присоединяться к классу ${cls}.`,
    next: 'Откройте класс, посмотрите, кто уже зашёл, и запустите короткую игру, пока все на связи.',
    cta: 'Открыть мой класс',
    signoff: 'Хорошего урока! Охад из LexiClash',
    dir: 'ltr',
  },
};

export function firstStudentUrl(locale: TeacherLocale, classroomId: string): string {
  return teacherEmailUrl(locale, '/teacher', 'first_student', { classroomId });
}

export function teacherFirstStudent({ fullName, locale, className, classroomId }: Args) {
  const lang: TeacherLocale = COPY[locale] ? locale : 'en';
  const c = COPY[lang];

  const html = renderNeoEmail({
    lang,
    dir: c.dir,
    preheader: c.preheader(className),
    accent: 'lime',
    art: 'welcome',
    kicker: c.tagline,
    headline: c.headline,
    greeting: c.greeting(firstName(fullName)),
    blocks: [
      { type: 'p', text: c.lead(className), strong: true },
      { type: 'p', text: c.next },
    ],
    cta: { label: c.cta, href: firstStudentUrl(lang, classroomId) },
    signoff: c.signoff,
  });

  return { subject: c.subject(className), html, replyTo: TEACHER_EMAIL_REPLY_TO };
}
