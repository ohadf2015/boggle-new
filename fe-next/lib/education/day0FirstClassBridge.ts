/**
 * Day-0 mode-bridge for a newly approved teacher.
 *
 * Prod 2026-11-06: teachers who try a second mode return at 22%. Day-0
 * quitters return at 4.3%. The class-created screen was asking for Polar
 * before the first live round; #1726 then took the Pro offer off that
 * screen entirely. This window sends day-0 teachers into the existing
 * class/assignment start instead; from day 3 of the access trial (or once
 * it has ended) the screen simply shows no card.
 *
 * Days since approval are read off the approval stamp. Approval sets
 * trial_expires_at to TEACHER_TRIAL_DAYS ahead, and daysLeft is rounded up,
 * so day 0 is 14 days left and day 3 is 11 days left.
 */
import { TEACHER_TRIAL_DAYS, teacherTrialStatus } from '@/lib/education/trial';

/** Paywall returns on this day (0 = approval day). Days before it get the bridge. */
export const DAY0_BRIDGE_PAYWALL_FROM_DAY = 3;

/**
 * Teachers approved since trials need a card have no access window, so their day
 * count comes from `approvedAt` (the access request, which approves on submit).
 */
export function showDay0FirstClassBridge(
  accessTrialExpires: string | null | undefined,
  nowMs: number,
  approvedAt?: string | null,
): boolean {
  if (!accessTrialExpires) {
    const approved = approvedAt ? Date.parse(approvedAt) : Number.NaN;
    if (!Number.isFinite(approved)) return false;
    const days = Math.floor((nowMs - approved) / 86_400_000);
    return days >= 0 && days < DAY0_BRIDGE_PAYWALL_FROM_DAY;
  }
  const trial = teacherTrialStatus(accessTrialExpires, nowMs);
  if (!trial || trial.isExpired) return false;
  const daysSinceApproval = TEACHER_TRIAL_DAYS - trial.daysLeft;
  return daysSinceApproval >= 0 && daysSinceApproval < DAY0_BRIDGE_PAYWALL_FROM_DAY;
}

export type FirstClassBridgeCopy = { title: string; body: string; cta: string };

const COPY: Record<string, FirstClassBridgeCopy> = {
  en: {
    title: 'Your first class in 2 minutes',
    body: 'Start a live round. Students join with the code on this page.',
    cta: 'Start the class',
  },
  he: {
    title: 'השיעור הראשון תוך 2 דקות',
    body: 'מתחילים סבב חי. התלמידים נכנסים עם הקוד שבעמוד.',
    cta: 'מתחילים את השיעור',
  },
  es: {
    title: 'Tu primera clase en 2 minutos',
    body: 'Empieza una ronda en vivo. Los estudiantes entran con el código de esta página.',
    cta: 'Empezar la clase',
  },
  sv: {
    title: 'Din första lektion på 2 minuter',
    body: 'Starta en liverunda. Eleverna går med med koden på den här sidan.',
    cta: 'Starta lektionen',
  },
  ja: {
    title: '2分で最初の授業',
    body: 'ライブのラウンドを始めます。生徒はこのページのコードで参加します。',
    cta: '授業を始める',
  },
  ru: {
    title: 'Первый урок за 2 минуты',
    body: 'Начните живой раунд. Ученики входят по коду на этой странице.',
    cta: 'Начать урок',
  },
};

export function firstClassBridgeCopy(locale: string): FirstClassBridgeCopy {
  const key = (locale || 'en').toLowerCase().split('-')[0];
  return COPY[key] ?? COPY.en;
}
