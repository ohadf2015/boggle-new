export const TEACHER_EMAIL_SITE = 'https://www.lexiclash.live';
/** Replies to trial emails go to Ohad, who reads them. */
export const TEACHER_EMAIL_REPLY_TO = 'ohadf2015@gmail.com';

/** Every teacher-page link in an email goes through here, so the visit it brings is attributed to that email. */
export function teacherEmailUrl(locale: string, path: string, campaign: string, params: Record<string, string> = {}): string {
  const url = new URL(`${TEACHER_EMAIL_SITE}/${locale}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', 'lifecycle');
  url.searchParams.set('utm_campaign', campaign);
  return url.toString().replace(/\+/g, '%20');
}

/** "lenita" -> "Lenita", "Lino Bossio" -> "Lino". Empty stays empty so copy can fall back. */
export function firstName(fullName: string | null | undefined): string {
  const first = (fullName ?? '').trim().split(/\s+/)[0] ?? '';
  return first ? first.charAt(0).toLocaleUpperCase() + first.slice(1) : '';
}
