/**
 * Copy for the classroom-page Teacher Pro offer.
 *
 * Self-contained per locale, same reason as the other Teacher Pro banners:
 * a partial catalogue must not render a raw key on the money path.
 * The button label still comes from resolveProOffer, so trial vs $9 cannot drift.
 * English is the measured line — do not paraphrase it.
 */
import { TRIAL_COPY_RTL, trialCopyBase } from '@/lib/education/pro/trialCtaCopy';

export const CLASSROOM_PRO_TITLE_EN = 'See which words this class missed';
export const CLASSROOM_PRO_BODY_EN =
  "Teacher Pro opens this class's report — the words they struggled with, ready to send home.";

export type ClassroomProOfferCopy = {
  title: string;
  body: string;
  dismiss: string;
  dir?: 'rtl';
};

const COPY: Record<string, Omit<ClassroomProOfferCopy, 'dir'>> = {
  en: {
    title: CLASSROOM_PRO_TITLE_EN,
    body: CLASSROOM_PRO_BODY_EN,
    dismiss: 'Not now',
  },
  he: {
    title: 'ראו אילו מילים הכיתה הזו פספסה',
    body: 'פרו למורים פותח את דוח הכיתה — המילים שהתקשו בהן, מוכן לשליחה הביתה.',
    dismiss: 'לא עכשיו',
  },
  es: {
    title: 'Mira qué palabras se le escaparon a esta clase',
    body: 'Teacher Pro abre el informe de esta clase: las palabras con las que batallaron, listo para enviar a casa.',
    dismiss: 'Ahora no',
  },
  sv: {
    title: 'Se vilka ord den här klassen missade',
    body: 'Teacher Pro öppnar klassens rapport — orden de kämpade med, redo att skicka hem.',
    dismiss: 'Inte nu',
  },
  ja: {
    title: 'このクラスが苦手だった単語を見る',
    body: 'Teacher Proでこのクラスのレポートが開きます。苦戦した単語を、家庭に送れる形で。',
    dismiss: '今はしない',
  },
  ru: {
    title: 'Посмотрите, какие слова этот класс пропустил',
    body: 'Teacher Pro открывает отчёт этого класса — слова, с которыми было трудно, готовые отправить домой.',
    dismiss: 'Не сейчас',
  },
};

export function classroomProOfferCopy(locale: string): ClassroomProOfferCopy {
  const base = trialCopyBase(locale);
  const row = COPY[base] ?? COPY.en;
  return { ...row, dir: TRIAL_COPY_RTL.has(base) ? 'rtl' : undefined };
}
