// Shared look for the teacher trial emails: a lime LexiClash header band, one
// white card, a main button and an optional quiet link under it.
// Table layout and inline styles only, so Gmail, Outlook and Apple Mail agree.

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

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** "lenita" -> "Lenita", "Lino Bossio" -> "Lino". Empty stays empty so copy can fall back. */
export function firstName(fullName: string | null | undefined): string {
  const first = (fullName ?? '').trim().split(/\s+/)[0] ?? '';
  return first ? first.charAt(0).toLocaleUpperCase() + first.slice(1) : '';
}

export interface TeacherEmailLayout {
  lang: string;
  dir: 'ltr' | 'rtl';
  /** Hidden inbox preview line. */
  preheader: string;
  /** Small caps label in the header band, e.g. "For teachers". */
  tagline: string;
  greeting: string;
  /** Bold first paragraph. */
  lead: string;
  paragraphs: string[];
  /** Pale panel for the feedback ask, so it reads as the point of the email. */
  callout?: string;
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
  signoff: string;
}

const NAVY = '#1a1a2e';
const LIME = '#BFFF00';
const FONT = 'Arial,Helvetica,sans-serif';

export function renderTeacherEmail(l: TeacherEmailLayout): string {
  const align = l.dir === 'rtl' ? 'right' : 'left';
  const p = (text: string, extra = '') =>
    `<p style="font-size:16px;line-height:1.6;margin:0 0 16px 0;${extra}">${escapeHtml(text)}</p>`;
  const callout = l.callout
    ? `<tr><td style="padding:4px 32px 8px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4ffd6;border:2px solid ${NAVY};border-radius:10px;">
            <tr><td dir="${l.dir}" align="${align}" style="padding:16px 18px;font-family:${FONT};color:${NAVY};font-size:16px;line-height:1.6;text-align:${align};">${escapeHtml(l.callout)}</td></tr>
          </table>
        </td></tr>`
    : '';
  const secondary = l.secondary
    ? `<p style="margin:14px 0 0 0;font-family:${FONT};font-size:14px;"><a href="${l.secondary.href}" style="color:${NAVY};text-decoration:underline;font-weight:700;">${escapeHtml(l.secondary.label)}</a></p>`
    : '';

  return `<!doctype html>
<html dir="${l.dir}" lang="${l.lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0e1430;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(l.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e1430;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:3px solid ${NAVY};">
        <tr><td style="background:${LIME};border-bottom:3px solid ${NAVY};padding:18px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td dir="ltr" align="left" style="font-family:${FONT};">
              <img src="${TEACHER_EMAIL_SITE}/icon-192.png" width="36" height="36" alt="" style="vertical-align:middle;border:2px solid ${NAVY};border-radius:8px;">
              <span style="vertical-align:middle;font-size:22px;font-weight:900;color:${NAVY};letter-spacing:0.5px;padding-left:10px;">LexiClash</span>
            </td>
            <td dir="${l.dir}" align="right" style="font-family:${FONT};font-size:12px;font-weight:800;color:${NAVY};text-transform:uppercase;letter-spacing:1px;">${escapeHtml(l.tagline)}</td>
          </tr></table>
        </td></tr>
        <tr><td dir="${l.dir}" align="${align}" style="padding:30px 32px 8px 32px;font-family:${FONT};color:${NAVY};text-align:${align};">
          <p style="font-size:20px;font-weight:800;margin:0 0 14px 0;">${escapeHtml(l.greeting)}</p>
          ${p(l.lead, 'font-weight:700;')}
          ${l.paragraphs.map((text) => p(text)).join('\n          ')}
        </td></tr>
        ${callout}
        <tr><td align="center" style="padding:16px 32px 28px 32px;">
          <a href="${l.cta.href}" style="background:${LIME};color:${NAVY};font-family:${FONT};font-weight:800;font-size:16px;padding:14px 30px;border-radius:10px;text-decoration:none;display:inline-block;border:3px solid ${NAVY};">${escapeHtml(l.cta.label)}</a>
          ${secondary}
        </td></tr>
        <tr><td dir="${l.dir}" align="${align}" style="padding:0 32px 30px 32px;font-family:${FONT};color:#4b5563;font-size:15px;text-align:${align};border-top:1px solid #e5e7eb;">
          <p style="margin:20px 0 0 0;">${escapeHtml(l.signoff)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
