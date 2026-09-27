export const SCHOOL_LEAD_NOTIFY_TO = 'ohadf2015@gmail.com';
export const SCHOOL_LEAD_ADMIN_URL = 'https://www.lexiclash.live/admin/school-leads';
export const SCHOOL_LEAD_DIGEST_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

export function schoolLeadDigestWindow(now = new Date()): { startIso: string; endIso: string } {
  const end = now;
  const start = new Date(now.getTime() - SCHOOL_LEAD_DIGEST_LOOKBACK_MS);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export type SchoolLeadDigestRow = {
  full_name: string;
  email: string;
  school_or_district: string;
  role: string;
  locale: string;
  created_at: string;
  source?: string | null;
};
