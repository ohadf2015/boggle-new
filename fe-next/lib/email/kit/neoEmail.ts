// One neo-brutalist look for every LexiClash email: navy page, cream card with a
// hard offset shadow, an accent hero with the mascot, and a chunky button.
// Tables and inline styles only; the shadow is a thick border, because Outlook
// and several Gmail apps drop box-shadow.

export const EMAIL_SITE = 'https://www.lexiclash.live';

export const NEO_COLORS = {
  page: '#1a1a2e',
  ink: '#1a1a2e',
  card: '#FFF8E7',
  white: '#FFFFFF',
  black: '#111111',
  muted: '#4b5563',
  footer: '#aab0c6',
} as const;

export const NEO_ACCENTS = {
  lime: '#BFFF00',
  pink: '#FF5FB0',
  cyan: '#00E5FF',
  purple: '#B794FF',
  orange: '#FF8A4C',
} as const;
export type NeoAccent = keyof typeof NEO_ACCENTS;

export const NEO_ART = ['welcome', 'miss-you', 'streak', 'card-oops', 'projector', 'report', 'gift', 'hourglass'] as const;
export type NeoArt = (typeof NEO_ART)[number];

export type NeoBlock =
  | { type: 'p'; text: string; strong?: boolean }
  | { type: 'callout'; text: string; title?: string }
  | { type: 'stats'; items: { value: string; label: string }[] }
  | { type: 'steps'; items: string[] }
  | { type: 'tiles'; word: string }
  /** Pre-escaped markup a template builds itself (a table of rows, a link list). */
  | { type: 'html'; html: string };

export interface NeoEmail {
  lang: string;
  dir: 'ltr' | 'rtl';
  /** Hidden inbox preview line. */
  preheader: string;
  accent: NeoAccent;
  art?: NeoArt;
  /** Sticker label above the headline, e.g. "For teachers". */
  kicker: string;
  headline: string;
  greeting?: string;
  blocks: NeoBlock[];
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
  signoff?: string;
  unsubscribe?: { label: string; href: string };
  /** Small print under the card, e.g. why they got this email. */
  footnote?: string;
  /** Override for local previews before the art is deployed. */
  assetBase?: string;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const FONT = "'Arial Black',Arial,Helvetica,sans-serif";
const BODY = 'Arial,Helvetica,sans-serif';

/** 3px black border with a 7px edge on the reading-end side and bottom: the hard shadow. */
function hard(dir: 'ltr' | 'rtl', w = 7): string {
  const side = dir === 'rtl' ? 'left' : 'right';
  return `border:3px solid ${NEO_COLORS.black};border-${side}-width:${w}px;border-bottom-width:${w}px;`;
}

function block(b: NeoBlock, e: NeoEmail, align: string): string {
  const accent = NEO_ACCENTS[e.accent];
  switch (b.type) {
    case 'p':
      return `<p style="margin:0 0 16px 0;font-family:${BODY};font-size:17px;line-height:1.55;color:${NEO_COLORS.ink};${b.strong ? 'font-weight:700;' : ''}">${escapeHtml(b.text)}</p>`;
    case 'callout': {
      const stripe = e.dir === 'rtl' ? 'right' : 'left';
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px 0;background:${NEO_COLORS.white};${hard(e.dir, 5)}border-${stripe}:10px solid ${accent};">
<tr><td dir="${e.dir}" align="${align}" style="padding:14px 18px;font-family:${BODY};font-size:16px;line-height:1.55;color:${NEO_COLORS.ink};text-align:${align};">${b.title ? `<div style="font-family:${FONT};font-size:13px;letter-spacing:1px;text-transform:uppercase;margin:0 0 6px 0;">${escapeHtml(b.title)}</div>` : ''}${escapeHtml(b.text).replace(/\n/g, '<br>')}</td></tr></table>`;
    }
    case 'stats': {
      const cells = b.items
        .map(
          (s) => `<td width="${Math.floor(100 / b.items.length)}%" style="padding:0 5px;" valign="top"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${accent};${hard(e.dir, 5)}"><tr><td align="center" style="padding:14px 6px;font-family:${FONT};color:${NEO_COLORS.ink};"><div style="font-size:30px;line-height:1;">${escapeHtml(s.value)}</div><div style="font-family:${BODY};font-weight:700;font-size:13px;margin-top:6px;">${escapeHtml(s.label)}</div></td></tr></table></td>`,
        )
        .join('');
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px 0;" dir="${e.dir}"><tr>${cells}</tr></table>`;
    }
    case 'steps': {
      const rows = b.items
        .map(
          (s, i) => `<tr><td width="40" valign="top" style="padding:0 0 12px 0;"><div style="width:30px;height:30px;line-height:30px;text-align:center;background:${accent};border:2px solid ${NEO_COLORS.black};border-radius:15px;font-family:${FONT};font-size:15px;color:${NEO_COLORS.ink};">${i + 1}</div></td><td dir="${e.dir}" align="${align}" valign="middle" style="padding:0 0 12px 0;font-family:${BODY};font-size:16px;line-height:1.45;color:${NEO_COLORS.ink};text-align:${align};">${escapeHtml(s)}</td></tr>`,
        )
        .join('');
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${e.dir}" style="margin:0 0 12px 0;">${rows}</table>`;
    }
    case 'tiles': {
      const tiles = Array.from(b.word)
        .map(
          (ch) => `<td data-tile style="padding:0 3px;"><div style="width:40px;height:40px;line-height:40px;text-align:center;background:${NEO_COLORS.white};border:2px solid ${NEO_COLORS.black};border-bottom-width:5px;border-radius:6px;font-family:${FONT};font-size:22px;color:${NEO_COLORS.ink};">${escapeHtml(ch)}</div></td>`,
        )
        .join('');
      const wordDir = /[֐-ࣿ]/.test(b.word) ? 'rtl' : 'ltr';
      return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" dir="${wordDir}" style="margin:2px auto 22px auto;"><tr>${tiles}</tr></table>`;
    }
    case 'html':
      return b.html;
  }
}

export function renderNeoEmail(e: NeoEmail): string {
  const align = e.dir === 'rtl' ? 'right' : 'left';
  const accent = NEO_ACCENTS[e.accent];
  const base = e.assetBase ?? EMAIL_SITE;
  const art = e.art
    ? `<td class="neo-art" width="190" align="center" valign="bottom" style="padding:16px 12px 0 12px;"><img src="${base}/email/art/${e.art}.png" width="170" alt="" style="display:block;width:170px;max-width:100%;height:auto;border:0;"></td>`
    : '';
  const secondary = e.secondary
    ? `<p style="margin:16px 0 0 0;font-family:${BODY};font-size:15px;"><a href="${escapeHtml(e.secondary.href)}" style="color:${NEO_COLORS.ink};font-weight:700;text-decoration:underline;">${escapeHtml(e.secondary.label)}</a></p>`
    : '';
  const signoff = e.signoff
    ? `<tr><td dir="${e.dir}" align="${align}" style="padding:0 30px 26px 30px;font-family:${BODY};font-size:15px;line-height:1.5;color:${NEO_COLORS.muted};text-align:${align};"><div style="border-top:2px dashed ${NEO_COLORS.black};padding-top:18px;">${escapeHtml(e.signoff)}</div></td></tr>`
    : '';
  const foot = [
    e.footnote ? escapeHtml(e.footnote) : '',
    e.unsubscribe ? `<a href="${escapeHtml(e.unsubscribe.href)}" style="color:${NEO_COLORS.footer};text-decoration:underline;">${escapeHtml(e.unsubscribe.label)}</a>` : '',
  ]
    .filter(Boolean)
    .join('<br>');

  return `<!doctype html>
<html dir="${e.dir}" lang="${e.lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<style>@media (max-width:520px){.neo-art{display:block!important;width:100%!important;padding:16px 0 0 0!important}.neo-hero{display:block!important;width:100%!important;text-align:center!important}.neo-pad{padding-left:20px!important;padding-right:20px!important}.neo-h1{font-size:28px!important}.neo-btn{display:block!important}}</style></head>
<body style="margin:0;padding:0;background:${NEO_COLORS.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(e.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NEO_COLORS.page};">
<tr><td align="center" style="padding:24px 10px 32px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
<tr><td dir="ltr" align="left" style="padding:0 4px 14px 4px;font-family:${FONT};font-size:24px;color:${NEO_ACCENTS.lime};letter-spacing:0.5px;"><img src="${base}/icon-192.png" width="34" height="34" alt="" style="vertical-align:middle;border:2px solid ${NEO_COLORS.black};border-radius:8px;">&nbsp; LexiClash</td></tr>
<tr><td style="background:${NEO_COLORS.card};${hard(e.dir)}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:${accent};border-bottom:3px solid ${NEO_COLORS.black};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${e.dir}"><tr>
<td class="neo-hero neo-pad" dir="${e.dir}" align="${align}" valign="middle" style="padding:26px 30px;text-align:${align};">
<span style="display:inline-block;background:${NEO_COLORS.ink};color:${NEO_COLORS.white};font-family:${FONT};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;padding:6px 10px;border-radius:4px;">${escapeHtml(e.kicker)}</span>
<h1 class="neo-h1" style="margin:14px 0 0 0;font-family:${FONT};font-size:32px;line-height:1.08;color:${NEO_COLORS.ink};font-weight:900;">${escapeHtml(e.headline)}</h1>
</td>${art}</tr></table>
</td></tr>
<tr><td class="neo-pad" dir="${e.dir}" align="${align}" style="padding:28px 30px 8px 30px;text-align:${align};">
${e.greeting ? `<p style="margin:0 0 14px 0;font-family:${FONT};font-size:19px;color:${NEO_COLORS.ink};">${escapeHtml(e.greeting)}</p>` : ''}
${e.blocks.map((b) => block(b, e, align)).join('\n')}
</td></tr>
<tr><td class="neo-pad" align="center" style="padding:10px 30px 30px 30px;">
<table role="presentation" cellpadding="0" cellspacing="0" class="neo-btn" style="margin:0 auto;"><tr><td align="center" style="background:${NEO_ACCENTS.lime};${hard(e.dir, 6)}border-radius:10px;">
<a href="${escapeHtml(e.cta.href)}" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:18px;color:${NEO_COLORS.ink};text-decoration:none;">${escapeHtml(e.cta.label)} ${e.dir === 'rtl' ? '&larr;' : '&rarr;'}</a>
</td></tr></table>
${secondary}
</td></tr>
${signoff}
</table>
</td></tr>
${foot ? `<tr><td dir="${e.dir}" align="center" style="padding:22px 20px 0 20px;font-family:${BODY};font-size:12px;line-height:1.6;color:${NEO_COLORS.footer};">${foot}</td></tr>` : ''}
</table>
</td></tr></table>
</body></html>`;
}
