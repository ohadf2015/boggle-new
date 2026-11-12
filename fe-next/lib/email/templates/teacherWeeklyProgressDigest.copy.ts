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

function ru(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const SV_KEEP = `Behåll rapporterna och obegränsat antal klasser för $${P}/mån.`;
const JA_KEEP = `月額$${P}で、レポートと無制限のクラスを引き続きご利用いただけます。`;
const ES_KEEP = `Quédate con los informes y las clases ilimitadas por $${P} al mes.`;
const RU_KEEP = `Отчёты и неограниченное число классов можно сохранить за $${P} в месяц.`;

export const DIGEST_COPY: Record<TeacherLocale, DigestCopy> = {
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
  sv: {
    subject: (n) => (n === 1 ? 'Din klass den här veckan' : `Dina ${n} klasser den här veckan`),
    preheader: (played, games) =>
      `${played} ${played === 1 ? 'elev' : 'elever'} spelade ${games} spel den här veckan. Här ser du vem som gått framåt och vem som har varit tyst.`,
    kicker: 'Veckorapport',
    headline: 'Din vecka i klassrummet',
    greeting: (n) => `Hej ${n},`,
    intro: 'Så här gick det för varje klass de senaste 7 dagarna, med vilka som blir bättre och vilka som inte har spelat än.',
    totalPlayed: 'elever spelade',
    totalGames: 'spel',
    totalWords: 'hittade ord',
    completion: 'Genomfört',
    accuracy: 'Träffsäkerhet',
    active: 'Elever som spelat',
    cta: `Starta Teacher Pro för $${P}/mån`,
    trialEndedCta: 'Aktivera Teacher Pro igen',
    trialEndedLine: `Din provperiod för Teacher Pro har tagit slut. Du kan behålla rapporterna och obegränsat antal klasser för $${P}/mån.`,
    trialActiveCta: `Behåll Pro för $${P}/mån`,
    trialActiveLine: (days) =>
      days <= 0
        ? `Din provperiod för Teacher Pro tar slut i dag. ${SV_KEEP}`
        : days === 1
          ? `Det är 1 dag kvar av din provperiod för Teacher Pro. ${SV_KEEP}`
          : `Det är ${days} dagar kvar av din provperiod för Teacher Pro. ${SV_KEEP}`,
    trialDay7Cta: `Uppgradera till Teacher Pro för $${P}/mån`,
    trialDay7Line: `Du är på dag 7 av din provperiod för Teacher Pro. ${SV_KEEP}`,
    games: 'Spel',
    words: 'Hittade ord',
    wow: 'Jämfört med förra veckan',
    wowValue: (s, g) => `${s} elever, ${g} spel`,
    inactive: 'Inaktiva 7 dagar',
    avgScore: 'Snittpoäng',
    movers: 'Elevernas utveckling',
    assignmentsDone: 'Klara uppgifter',
    ctaNote: 'Med Teacher Pro får du obegränsat antal klasser och rapporter som går att skriva ut. Du kan säga upp när du vill.',
    openDashboard: 'Öppna lärarpanelen',
    signoff: 'Ohad från LexiClash. Svara gärna när du vill, jag läser alla svar.',
    dir: 'ltr',
    na: '-',
  },
  ja: {
    subject: (n) => (n === 1 ? '今週のクラスの様子' : `今週の${n}クラスの様子`),
    preheader: (played, games) =>
      `今週は${played}人の生徒が${games}回プレイしました。伸びている生徒と、最近プレイしていない生徒をお知らせします。`,
    kicker: '週間レポート',
    headline: '今週のクラスの様子',
    greeting: (n) => `${n}先生`,
    intro: '過去7日間の各クラスの様子をまとめました。上達している生徒や、まだプレイしていない生徒もわかります。',
    totalPlayed: 'プレイした生徒',
    totalGames: 'ゲーム',
    totalWords: '見つけた単語',
    completion: '完了率',
    accuracy: '正答率',
    active: 'プレイした生徒',
    cta: `月額$${P}でTeacher Proを始める`,
    trialEndedCta: 'Teacher Proを再開する',
    trialEndedLine: `Teacher Proのお試し期間が終了しました。${JA_KEEP}`,
    trialActiveCta: `月額$${P}でProを続ける`,
    trialActiveLine: (days) =>
      days <= 0
        ? `Teacher Proのお試し期間は今日で終了します。${JA_KEEP}`
        : `Teacher Proのお試し期間は残り${days}日です。${JA_KEEP}`,
    trialDay7Cta: `月額$${P}でTeacher Proにアップグレード`,
    trialDay7Line: `Teacher Proのお試し期間も7日目になりました。${JA_KEEP}`,
    games: 'ゲーム数',
    words: '見つけた単語',
    wow: '先週との比較',
    wowValue: (s, g) => `生徒${s}人、ゲーム${g}回`,
    inactive: '7日間プレイなし',
    avgScore: '平均スコア',
    movers: '生徒の動き',
    assignmentsDone: '完了した課題',
    ctaNote: 'Teacher Proでは、クラスを無制限に作成でき、レポートも印刷できます。いつでも解約できます。',
    openDashboard: '教師用ダッシュボードを開く',
    signoff: 'LexiClashのオハドより。いつでもお気軽に返信してください。いただいた返信はすべて読んでいます。',
    dir: 'ltr',
    na: '-',
  },
  es: {
    subject: (n) => (n === 1 ? 'Tu clase esta semana' : `Tus ${n} clases esta semana`),
    preheader: (played, games) =>
      `Esta semana ${played} ${played === 1 ? 'alumno jugó' : 'alumnos jugaron'} ${games} ${games === 1 ? 'partida' : 'partidas'}. Mira quién avanzó y quién dejó de jugar.`,
    kicker: 'Informe semanal',
    headline: 'Tu semana en clase',
    greeting: (n) => `Hola, ${n}:`,
    intro: 'Así le fue a cada clase en los últimos 7 días, con quién está mejorando y quién todavía no ha jugado.',
    totalPlayed: 'alumnos jugaron',
    totalGames: 'partidas',
    totalWords: 'palabras encontradas',
    completion: 'Completado',
    accuracy: 'Precisión',
    active: 'Alumnos que jugaron',
    cta: `Empieza Teacher Pro por $${P} al mes`,
    trialEndedCta: 'Reactiva Teacher Pro',
    trialEndedLine: `Tu prueba de Teacher Pro terminó. Puedes seguir con los informes y las clases ilimitadas por $${P} al mes.`,
    trialActiveCta: `Sigue con Pro por $${P} al mes`,
    trialActiveLine: (days) =>
      days <= 0
        ? `Tu prueba de Teacher Pro termina hoy. ${ES_KEEP}`
        : days === 1
          ? `Te queda 1 día de prueba de Teacher Pro. ${ES_KEEP}`
          : `Te quedan ${days} días de prueba de Teacher Pro. ${ES_KEEP}`,
    trialDay7Cta: `Pásate a Teacher Pro por $${P} al mes`,
    trialDay7Line: `Vas por el día 7 de tu prueba de Teacher Pro. ${ES_KEEP}`,
    games: 'Partidas',
    words: 'Palabras encontradas',
    wow: 'Frente a la semana pasada',
    wowValue: (s, g) => `${s} alumnos, ${g} partidas`,
    inactive: 'Inactivos 7 días',
    avgScore: 'Puntuación media',
    movers: 'Cómo van los alumnos',
    assignmentsDone: 'Tareas completadas',
    ctaNote: 'Con Teacher Pro tienes clases ilimitadas e informes para imprimir. Puedes cancelar cuando quieras.',
    openDashboard: 'Abrir el panel docente',
    signoff: 'Ohad, de LexiClash. Puedes responder cuando quieras, leo todas las respuestas.',
    dir: 'ltr',
    na: '-',
  },
  ru: {
    subject: (n) => (n === 1 ? 'Итоги недели в вашем классе' : `Итоги недели: ${n} ${ru(n, 'класс', 'класса', 'классов')}`),
    preheader: (played, games) =>
      `На этой неделе ${played} ${ru(played, 'ученик сыграл', 'ученика сыграли', 'учеников сыграли')} ${games} ${ru(games, 'игру', 'игры', 'игр')}. Смотрите, кто продвинулся, а кто затих.`,
    kicker: 'Еженедельный отчёт',
    headline: 'Ваша неделя в классе',
    greeting: (n) => `Здравствуйте, ${n}!`,
    intro: 'Вот как прошли последние 7 дней в каждом классе: кто становится лучше, а кто ещё не играл.',
    totalPlayed: 'учеников играло',
    totalGames: 'игр',
    totalWords: 'слов найдено',
    completion: 'Выполнение',
    accuracy: 'Точность',
    active: 'Ученики, которые играли',
    cta: `Подключить Teacher Pro за $${P} в месяц`,
    trialEndedCta: 'Снова подключить Teacher Pro',
    trialEndedLine: `Пробный период Teacher Pro закончился. ${RU_KEEP}`,
    trialActiveCta: `Оставить Pro за $${P} в месяц`,
    trialActiveLine: (days) =>
      days <= 0
        ? `Пробный период Teacher Pro заканчивается сегодня. ${RU_KEEP}`
        : `До конца пробного периода Teacher Pro ${ru(days, 'остался', 'осталось', 'осталось')} ${days} ${ru(days, 'день', 'дня', 'дней')}. ${RU_KEEP}`,
    trialDay7Cta: `Перейти на Teacher Pro за $${P} в месяц`,
    trialDay7Line: `Идёт 7-й день пробного периода Teacher Pro. ${RU_KEEP}`,
    games: 'Игры',
    words: 'Найдено слов',
    wow: 'По сравнению с прошлой неделей',
    wowValue: (s, g) => `учеников: ${s}, игр: ${g}`,
    inactive: 'Не играли 7 дней',
    avgScore: 'Средний балл',
    movers: 'Кто как продвинулся',
    assignmentsDone: 'Выполнено заданий',
    ctaNote: 'С Teacher Pro можно создавать сколько угодно классов и распечатывать отчёты. Отменить подписку можно в любой момент.',
    openDashboard: 'Открыть кабинет учителя',
    signoff: 'Охад из LexiClash. Отвечайте на это письмо когда угодно, я читаю каждый ответ.',
    dir: 'ltr',
    na: '-',
  },
};
