import type { TeacherLocale } from '@/lib/education/types';
import { TEACHER_PRO_PRICE_USD as P } from '@/lib/education/freeTierLimits';

export interface DigestCopy {
  subject: (n: number) => string;
  preheader: (played: number, games: number) => string;
  kicker: string;
  headline: string;
  greeting: (name: string) => string;
  intro: string;
  totalPlayed: string;
  totalGames: string;
  totalWords: string;
  completion: string;
  accuracy: string;
  active: string;
  cta: string;
  trialEndedCta: string;
  trialEndedLine: string;
  trialActiveCta: string;
  trialActiveLine: (days: number) => string;
  trialDay7Cta: string;
  trialDay7Line: string;
  games: string;
  words: string;
  wow: string;
  wowValue: (students: string, games: string) => string;
  inactive: string;
  avgScore: string;
  movers: string;
  assignmentsDone: string;
  ctaNote: string;
  openDashboard: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
  na: string;
}

export const DIGEST_COPY: Partial<Record<TeacherLocale, DigestCopy>> & { en: DigestCopy } = {
  en: {
    subject: (n) => (n === 1 ? 'Your class this week' : `Your ${n} classes this week`),
    preheader: (played, games) => `${played} students played ${games} games this week. Here is who moved and who went quiet.`,
    kicker: 'Weekly report',
    headline: 'Your week in class',
    greeting: (n) => `Hi ${n},`,
    intro: 'Here is how each class did over the last 7 days, including who is improving and who has not played.',
    totalPlayed: 'students played',
    totalGames: 'games',
    totalWords: 'words found',
    completion: 'Completion',
    accuracy: 'Accuracy',
    active: 'Students who played',
    cta: `Start Teacher Pro for $${P}/mo`,
    trialEndedCta: 'Reactivate Teacher Pro',
    trialEndedLine: `Your Teacher Pro trial ended. You can keep reports and unlimited classes for $${P}/mo.`,
    trialActiveCta: `Keep Pro for $${P}/mo`,
    trialActiveLine: (days) =>
      days <= 0
        ? `Your Teacher Pro trial ends today. Keep reports and unlimited classes for $${P}/mo.`
        : days === 1
          ? `1 day left in your Teacher Pro trial. Keep reports and unlimited classes for $${P}/mo.`
          : `${days} days left in your Teacher Pro trial. Keep reports and unlimited classes for $${P}/mo.`,
    trialDay7Cta: `Upgrade to Teacher Pro for $${P}/mo`,
    trialDay7Line: `Day 7 of your Teacher Pro trial. Keep reports and unlimited classes for $${P}/mo.`,
    games: 'Games',
    words: 'Words found',
    wow: 'vs last week',
    wowValue: (s, g) => `${s} students, ${g} games`,
    inactive: 'Inactive 7d',
    avgScore: 'Avg score',
    movers: 'Student movement',
    assignmentsDone: 'Assignments done',
    ctaNote: 'Teacher Pro gives you unlimited classes and printable reports. Cancel any time.',
    openDashboard: 'Open teacher dashboard',
    signoff: 'Ohad from LexiClash. Reply any time, I read every answer.',
    dir: 'ltr',
    na: '-',
  },
  he: {
    subject: (n) => (n === 1 ? 'הכיתה שלך השבוע' : `${n} הכיתות שלך השבוע`),
    preheader: (played, games) => `${played} תלמידים שיחקו ${games} משחקים השבוע. מי התקדם ומי נעלם.`,
    kicker: 'סיכום שבועי',
    headline: 'השבוע שלך בכיתה',
    greeting: (n) => `היי ${n},`,
    intro: 'ככה עבר על כל כיתה ב-7 הימים האחרונים, כולל מי משתפר ומי עוד לא שיחק.',
    totalPlayed: 'תלמידים שיחקו',
    totalGames: 'משחקים',
    totalWords: 'מילים שנמצאו',
    completion: 'השלמה',
    accuracy: 'דיוק',
    active: 'תלמידים ששיחקו',
    cta: `להתחיל Teacher Pro ב-${P}$ לחודש`,
    trialEndedCta: 'להפעיל מחדש את Teacher Pro',
    trialEndedLine: `תקופת הניסיון של Teacher Pro הסתיימה. אפשר להמשיך עם דוחות וכיתות ללא הגבלה ב-${P}$ לחודש.`,
    trialActiveCta: `להמשיך עם Pro ב-${P}$ לחודש`,
    trialActiveLine: (days) =>
      days <= 0
        ? `ניסיון Teacher Pro מסתיים היום. אפשר לשמור על דוחות וכיתות ללא הגבלה ב-${P}$ לחודש.`
        : days === 1
          ? `נשאר יום אחד בניסיון Teacher Pro. אפשר לשמור על דוחות וכיתות ללא הגבלה ב-${P}$ לחודש.`
          : `נשארו ${days} ימים בניסיון Teacher Pro. אפשר לשמור על דוחות וכיתות ללא הגבלה ב-${P}$ לחודש.`,
    trialDay7Cta: `לשדרג ל-Teacher Pro ב-${P}$ לחודש`,
    trialDay7Line: `יום 7 בניסיון Teacher Pro. אפשר לשמור על דוחות וכיתות ללא הגבלה ב-${P}$ לחודש.`,
    games: 'משחקים',
    words: 'מילים שנמצאו',
    wow: 'מול השבוע שעבר',
    wowValue: (s, g) => `${s} תלמידים, ${g} משחקים`,
    inactive: 'לא פעילים 7 ימים',
    avgScore: 'ציון ממוצע',
    movers: 'תנועת תלמידים',
    assignmentsDone: 'מטלות שהושלמו',
    ctaNote: 'ב-Teacher Pro יש כיתות ללא הגבלה ודוחות להדפסה. אפשר לבטל בכל רגע.',
    openDashboard: 'ללוח המורה',
    signoff: 'אוהד מ-LexiClash. אפשר לענות למייל מתי שרוצים, אני קורא כל תשובה.',
    dir: 'rtl',
    na: '-',
  },
};
