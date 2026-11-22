export const REPORT_TABS = ['students', 'games', 'words', 'homework', 'more'] as const;
export type ReportTab = (typeof REPORT_TABS)[number];

const TAB_ALIASES: Record<string, ReportTab> = { pulse: 'words', lessons: 'more' };

export function resolveReportTab(asked: string | null | undefined): ReportTab | null {
  if (!asked) return null;
  if ((REPORT_TABS as readonly string[]).includes(asked)) return asked as ReportTab;
  return TAB_ALIASES[asked] ?? null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A `?classroomId=null` link once queried `classrooms?id=eq.null`; anything but a uuid is no id. */
export function reportId(value: string | null | undefined): string | null {
  return value && UUID.test(value) ? value : null;
}
