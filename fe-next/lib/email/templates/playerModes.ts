import { EMAIL_SITE, NEO_ACCENTS, NEO_COLORS, escapeHtml } from '@/lib/email/kit/neoEmail';
import type { WelcomeEmailMode } from '@/lib/email/welcomeModes';

const NAVY = '#1a1a2e';
const BLACK = NEO_COLORS.black;
const WHITE = '#FFFFFF';
const FOOTER = '#aab0c6';
const HEAD = "'Arial Black',Arial,Helvetica,sans-serif";
const BODY = 'Arial,Helvetica,sans-serif';
const COLS = 3;

function rows<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += COLS) out.push(items.slice(i, i + COLS));
  return out;
}

function heading(title: string, align: string): string {
  return `<p style="margin:6px 0 12px 0;font-family:${HEAD};font-size:15px;letter-spacing:1px;text-transform:uppercase;color:${NAVY};text-align:${align};">${escapeHtml(title)}</p>`;
}

// Cube art always loads from production: links follow the caller's base, images must exist on the live site.
function cubeSrc(m: WelcomeEmailMode): string {
  return `${EMAIL_SITE}${new URL(m.cubeImageUrl).pathname}`;
}

export function modeCardsHtml(modes: WelcomeEmailMode[], title: string, dir: 'ltr' | 'rtl'): string {
  const align = dir === 'rtl' ? 'right' : 'left';
  const body = rows(modes)
    .map((row) => {
      const cells = row
        .map(
          (m) => `<td width="33%" valign="top" style="padding:0 4px 10px 4px;"><a href="${m.href}" style="display:block;text-decoration:none;background:${NAVY};border:2px solid ${BLACK};border-bottom-width:5px;border-radius:8px;"><img src="${cubeSrc(m)}" width="150" alt="${escapeHtml(m.title)}" style="display:block;width:100%;max-width:150px;height:auto;margin:0 auto;border:0;"><span style="display:block;padding:2px 6px 0 6px;font-family:${HEAD};font-size:14px;line-height:1.2;color:${WHITE};text-align:center;">${escapeHtml(m.title)}</span><span style="display:block;padding:3px 6px 10px 6px;font-family:${BODY};font-size:12px;line-height:1.3;color:${NEO_ACCENTS.lime};text-align:center;">${escapeHtml(m.tagline)}</span></a></td>`,
        )
        .join('');
      return `<tr>${cells}${'<td width="33%"></td>'.repeat(COLS - row.length)}</tr>`;
    })
    .join('');
  return `${heading(title, align)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${dir}" style="margin:0 0 14px 0;">${body}</table>`;
}

export function modeChipsHtml(modes: WelcomeEmailMode[], title: string, dir: 'ltr' | 'rtl'): string {
  const align = dir === 'rtl' ? 'right' : 'left';
  const body = rows(modes)
    .map((row) => {
      const cells = row
        .map(
          (m) => `<td width="33%" style="padding:0 3px 8px 3px;"><a href="${m.href}" style="display:block;padding:9px 4px;text-decoration:none;background:${WHITE};border:2px solid ${BLACK};border-bottom-width:4px;border-radius:6px;font-family:${HEAD};font-size:13px;line-height:1.2;color:${NAVY};text-align:center;">${escapeHtml(m.title)}</a></td>`,
        )
        .join('');
      return `<tr>${cells}${'<td width="33%"></td>'.repeat(COLS - row.length)}</tr>`;
    })
    .join('');
  return `${heading(title, align)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${dir}" style="margin:0 0 10px 0;">${body}</table>`;
}

export function modesText(modes: WelcomeEmailMode[]): string {
  return modes.map((m) => `- ${m.title}: ${m.tagline}\n  ${m.href}`).join('\n');
}

// The kit footer has one link slot; the privacy link sits right after the unsubscribe link.
export function withPrivacyLink(html: string, unsubscribeUrl: string, label: string, href: string): string {
  const at = html.lastIndexOf(`href="${unsubscribeUrl}"`);
  const end = at < 0 ? -1 : html.indexOf('</a>', at);
  if (end < 0) return html;
  const cut = end + 4;
  return `${html.slice(0, cut)} &middot; <a href="${href}" style="color:${FOOTER};text-decoration:underline;">${escapeHtml(label)}</a>${html.slice(cut)}`;
}
