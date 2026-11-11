import type { TeacherLocale } from '@/lib/education/types';
import { TEACHER_PRO_PRICE_USD as P } from '@/lib/education/freeTierLimits';

export interface AssignmentDueCopy {
  subjectDueSoon: (title: string) => string;
  subjectOverdue: (n: number) => string;
  subjectBoth: () => string;
  preheaderDueSoon: string;
  preheaderOverdue: string;
  kicker: string;
  headlineDueSoon: string;
  headlineOverdue: string;
  headlineBoth: string;
  greeting: (name: string) => string;
  dueSoonTitle: string;
  dueSoonIntro: string;
  overdueTitle: string;
  overdueIntro: string;
  missing: (n: number) => string;
  openReport: string;
  cta: string;
  ctaNote: string;
  fallbackTitle: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

export const ASSIGNMENT_DUE_COPY: Record<TeacherLocale, AssignmentDueCopy> = {
  en: {
    subjectDueSoon: (title) => `Homework due tomorrow: ${title}`,
    subjectOverdue: (n) => (n === 1 ? '1 student has overdue homework' : `${n} students have overdue homework`),
    subjectBoth: () => 'Homework due tomorrow, plus some overdue',
    preheaderDueSoon: 'There is still time for a reminder in class.',
    preheaderOverdue: 'The progress report shows exactly who still owes it.',
    kicker: 'Homework check',
    headlineDueSoon: 'Homework due tomorrow',
    headlineOverdue: 'Some homework is overdue',
    headlineBoth: 'Your homework check-in',
    greeting: (n) => `Hi ${n},`,
    dueSoonTitle: 'Due tomorrow',
    dueSoonIntro: 'Students still have time. A quick reminder in class usually does it, or open the progress report to see who has not played yet.',
    overdueTitle: 'Overdue',
    overdueIntro: 'These are past their due date. The progress report shows who still owes the work.',
    missing: (n) => (n === 1 ? '1 student missing' : `${n} students missing`),
    openReport: 'Open the progress report',
    cta: `Start Teacher Pro for $${P}/mo`,
    ctaNote: 'Teacher Pro adds a printable CSV, full reports and unlimited classes. Cancel any time.',
    fallbackTitle: 'assignment',
    signoff: 'Ohad from LexiClash',
    dir: 'ltr',
  },
  he: {
    subjectDueSoon: (title) => `שיעורי בית להגשה מחר: ${title}`,
    subjectOverdue: (n) => (n === 1 ? 'לתלמיד אחד עדיין חסרים שיעורי בית' : `ל-${n} תלמידים עדיין חסרים שיעורי בית`),
    subjectBoth: () => 'שיעורי בית להגשה מחר, וכמה באיחור',
    preheaderDueSoon: 'עוד יש זמן להזכיר בכיתה.',
    preheaderOverdue: 'בדוח ההתקדמות רואים בדיוק למי עוד חסר.',
    kicker: 'מעקב שיעורי בית',
    headlineDueSoon: 'שיעורי בית להגשה מחר',
    headlineOverdue: 'יש שיעורי בית באיחור',
    headlineBoth: 'מה קורה עם שיעורי הבית',
    greeting: (n) => `היי ${n},`,
    dueSoonTitle: 'להגשה מחר',
    dueSoonIntro: 'לתלמידים עוד יש זמן. תזכורת קצרה בכיתה בדרך כלל מספיקה, ואפשר גם לפתוח את דוח ההתקדמות ולראות מי עוד לא שיחק.',
    overdueTitle: 'באיחור',
    overdueIntro: 'המועד של אלה כבר עבר. בדוח ההתקדמות רואים למי עדיין חסר.',
    missing: (n) => (n === 1 ? 'תלמיד אחד חסר' : `${n} תלמידים חסרים`),
    openReport: 'לפתוח את דוח ההתקדמות',
    cta: `להתחיל Teacher Pro ב-${P}$ לחודש`,
    ctaNote: 'ב-Teacher Pro יש ייצוא CSV להדפסה, דוחות מלאים וכיתות ללא הגבלה. אפשר לבטל בכל רגע.',
    fallbackTitle: 'מטלה',
    signoff: 'אוהד מ-LexiClash',
    dir: 'rtl',
  },
  sv: {
    subjectDueSoon: (title) => `Läxa till i morgon: ${title}`,
    subjectOverdue: (n) => (n === 1 ? '1 elev har inte gjort läxan än' : `${n} elever har inte gjort läxan än`),
    subjectBoth: () => 'Läxa till i morgon, och några försenade',
    preheaderDueSoon: 'Det finns fortfarande tid att påminna i klassen.',
    preheaderOverdue: 'Framstegsrapporten visar exakt vem som saknas.',
    kicker: 'Läxkoll',
    headlineDueSoon: 'Läxa till i morgon',
    headlineOverdue: 'Några läxor är försenade',
    headlineBoth: 'Din läxkoll',
    greeting: (n) => `Hej ${n},`,
    dueSoonTitle: 'Till i morgon',
    dueSoonIntro: 'Eleverna har fortfarande tid. En snabb påminnelse i klassen brukar räcka, eller öppna framstegsrapporten och se vem som inte har spelat än.',
    overdueTitle: 'Försenade',
    overdueIntro: 'De här har passerat sitt datum. Framstegsrapporten visar vem som fortfarande saknas.',
    missing: (n) => (n === 1 ? '1 elev saknas' : `${n} elever saknas`),
    openReport: 'Öppna framstegsrapporten',
    cta: `Starta Teacher Pro för $${P}/mån`,
    ctaNote: 'Teacher Pro ger utskrivbar CSV, fullständiga rapporter och obegränsat antal klasser. Avsluta när du vill.',
    fallbackTitle: 'uppgift',
    signoff: 'Ohad på LexiClash',
    dir: 'ltr',
  },
  ja: {
    subjectDueSoon: (title) => `明日が提出期限の宿題: ${title}`,
    subjectOverdue: (n) => `宿題が未提出の生徒が${n}人います`,
    subjectBoth: () => '明日が期限の宿題と、期限切れの宿題があります',
    preheaderDueSoon: '授業でひと声かける時間はまだあります。',
    preheaderOverdue: '進捗レポートで未提出の生徒を確認できます。',
    kicker: '宿題チェック',
    headlineDueSoon: '明日が宿題の提出期限です',
    headlineOverdue: '期限切れの宿題があります',
    headlineBoth: '宿題の状況まとめ',
    greeting: (n) => `${n}様`,
    dueSoonTitle: '明日が期限',
    dueSoonIntro: 'まだ時間はあります。授業でひと声かければ大体足ります。まだ遊んでいない生徒は進捗レポートで確認できます。',
    overdueTitle: '期限切れ',
    overdueIntro: 'これらは提出期限を過ぎています。まだ終わっていない生徒は進捗レポートで確認できます。',
    missing: (n) => `未提出 ${n}人`,
    openReport: '進捗レポートを開く',
    cta: `Teacher Proを始める（月額$${P}）`,
    ctaNote: 'Teacher Proでは印刷用CSV、詳しいレポート、無制限のクラスが使えます。いつでも解約できます。',
    fallbackTitle: '課題',
    signoff: 'LexiClashのOhadより',
    dir: 'ltr',
  },
  es: {
    subjectDueSoon: (title) => `Deberes para mañana: ${title}`,
    subjectOverdue: (n) => (n === 1 ? 'A 1 estudiante le faltan los deberes' : `A ${n} estudiantes les faltan los deberes`),
    subjectBoth: () => 'Deberes para mañana, y algunos atrasados',
    preheaderDueSoon: 'Todavía hay tiempo para recordarlo en clase.',
    preheaderOverdue: 'El informe de progreso muestra quién falta exactamente.',
    kicker: 'Deberes',
    headlineDueSoon: 'Deberes para mañana',
    headlineOverdue: 'Hay deberes atrasados',
    headlineBoth: 'Cómo van los deberes',
    greeting: (n) => `Hola, ${n}:`,
    dueSoonTitle: 'Para mañana',
    dueSoonIntro: 'Tus estudiantes todavía tienen tiempo. Un recordatorio rápido en clase suele bastar, o abre el informe de progreso para ver quién no ha jugado aún.',
    overdueTitle: 'Atrasados',
    overdueIntro: 'Ya pasó su fecha de entrega. El informe de progreso muestra a quién le falta todavía.',
    missing: (n) => (n === 1 ? 'falta 1 estudiante' : `faltan ${n} estudiantes`),
    openReport: 'Abrir el informe de progreso',
    cta: `Empezar Teacher Pro por $${P}/mes`,
    ctaNote: 'Teacher Pro añade CSV para imprimir, informes completos y clases ilimitadas. Cancela cuando quieras.',
    fallbackTitle: 'tarea',
    signoff: 'Ohad, de LexiClash',
    dir: 'ltr',
  },
  ru: {
    subjectDueSoon: (title) => `Домашнее задание на завтра: ${title}`,
    subjectOverdue: (n) => `Не сдали домашнее задание: ${n}`,
    subjectBoth: () => 'Задание на завтра и несколько просроченных',
    preheaderDueSoon: 'Ещё есть время напомнить классу.',
    preheaderOverdue: 'В отчёте о прогрессе видно, кто ещё не сдал.',
    kicker: 'Домашние задания',
    headlineDueSoon: 'Задание на завтра',
    headlineOverdue: 'Есть просроченные задания',
    headlineBoth: 'Сводка по домашним заданиям',
    greeting: (n) => `Здравствуйте, ${n}!`,
    dueSoonTitle: 'Срок завтра',
    dueSoonIntro: 'У учеников ещё есть время. Обычно хватает короткого напоминания на уроке, а в отчёте о прогрессе видно, кто ещё не играл.',
    overdueTitle: 'Просрочено',
    overdueIntro: 'Срок сдачи уже прошёл. В отчёте о прогрессе видно, кто ещё не выполнил задание.',
    missing: (n) => `не сдали: ${n}`,
    openReport: 'Открыть отчёт о прогрессе',
    cta: `Подключить Teacher Pro за $${P}/мес`,
    ctaNote: 'В Teacher Pro есть CSV для печати, полные отчёты и неограниченные классы. Отмена в любой момент.',
    fallbackTitle: 'задание',
    signoff: 'Охад из LexiClash',
    dir: 'ltr',
  },
};
