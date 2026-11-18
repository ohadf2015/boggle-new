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
    subject: (cls) => `Someone just joined ${cls}`,
    preheader: (cls) => `${cls} is not empty anymore.`,
    tagline: 'For teachers',
    headline: 'Your first student is in',
    greeting: (n) => (n ? `Hi ${n},` : 'Hi there,'),
    lead: (cls) => `A student just joined ${cls}. The class has its first member.`,
    next: 'Open your class to see the roster and start a quick game while they are around.',
    cta: 'Open my class',
    signoff: 'Have a good lesson! Ohad from LexiClash',
    dir: 'ltr',
  },
  he: {
    subject: (cls) => `מישהו הצטרף ל${cls}`,
    preheader: (cls) => `הכיתה ${cls} כבר לא ריקה.`,
    tagline: 'למורים',
    headline: 'ההצטרפות הראשונה לכיתה',
    greeting: (n) => (n ? `היי ${n},` : 'היי,'),
    lead: (cls) => `מישהו מהתלמידים שלך הצטרף עכשיו ל${cls}. יש לכיתה חבר ראשון.`,
    next: 'נכנסים לכיתה, רואים מי שם, ומתחילים משחק קצר בזמן שהוא עדיין מחובר.',
    cta: 'לכיתה שלי',
    signoff: 'שיעור מוצלח! אוהד מ-LexiClash',
    dir: 'rtl',
  },
  es: {
    subject: (cls) => `Alguien acaba de unirse a ${cls}`,
    preheader: (cls) => `${cls} ya no está vacía.`,
    tagline: 'Para docentes',
    headline: 'Ya tienes a tu primer alumno',
    greeting: (n) => (n ? `Hola, ${n}:` : 'Hola:'),
    lead: (cls) => `Un alumno acaba de unirse a ${cls}. La clase ya tiene su primer miembro.`,
    next: 'Abre tu clase para ver la lista y empieza una partida rápida mientras sigue conectado.',
    cta: 'Ir a mi clase',
    signoff: '¡Que vaya muy bien la clase! Ohad, de LexiClash',
    dir: 'ltr',
  },
  sv: {
    subject: (cls) => `Någon har just gått med i ${cls}`,
    preheader: (cls) => `${cls} är inte tom längre.`,
    tagline: 'För lärare',
    headline: 'Din första elev är med',
    greeting: (n) => (n ? `Hej ${n},` : 'Hej,'),
    lead: (cls) => `En elev har just gått med i ${cls}. Klassen har fått sin första medlem.`,
    next: 'Öppna klassen för att se vilka som är med och starta ett snabbt spel medan eleven är kvar.',
    cta: 'Öppna min klass',
    signoff: 'Lycka till på lektionen! Ohad på LexiClash',
    dir: 'ltr',
  },
  ja: {
    subject: (cls) => `${cls}に最初の生徒が参加しました`,
    preheader: (cls) => `${cls}に参加者がいます。`,
    tagline: '先生向け',
    headline: '最初の生徒が参加しました',
    greeting: (n) => (n ? `${n}さん、こんにちは。` : 'こんにちは。'),
    lead: (cls) => `${cls}に生徒が1人参加しました。クラスに最初のメンバーが入りましたよ。`,
    next: 'クラスを開いて名簿を確認し、そのまま短いゲームを始めてみてください。',
    cta: 'クラスを開く',
    signoff: '良い授業を！ LexiClashのOhadより',
    dir: 'ltr',
  },
  ru: {
    subject: (cls) => `В ${cls} кто-то зашёл`,
    preheader: (cls) => `Класс ${cls} больше не пустой.`,
    tagline: 'Для учителей',
    headline: 'У вас появился первый ученик',
    greeting: (n) => (n ? `Здравствуйте, ${n}!` : 'Здравствуйте!'),
    lead: (cls) => `Ученик только что присоединился к классу ${cls}. В классе появился первый участник.`,
    next: 'Откройте класс, посмотрите список и запустите короткую игру, пока ученик на связи.',
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
