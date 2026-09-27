/**
 * Unplugged reteach printable pack PDF — cover + practice sheet with QR deep-link.
 *
 * After Live ends with missed words, teachers print one pack: cover page with a QR
 * that opens Unplugged reteach Live (#959) on the projector, plus the #957 student
 * practice pages (write + sentence). Class-level words only — never student names.
 *
 * Foil: Kahoot Classic Unplugged has no printable pack with a Live QR deep-link.
 * Extends #959 / #957 / #980. Moat ~6:28am Asia/Dubai.
 *
 * Pure HTML builder is side-effect free (SSR / unit safe). Browser print opens a
 * blank window, writes the document, and triggers the print dialog (Save as PDF).
 */

import {
  normalizeMissedWordsForSheet,
  type MissedWordsPracticeSheetLabels,
} from './missedWordsPracticeSheet';
import { buildUnpluggedReteachUrl } from './unpluggedReteachLive';
import {
  toClassGapPayload,
  type ClassGapShareInput,
  type ClassGapSharePayload,
} from './classGapShare';

export const UNPLUGGED_PACK_QR_UTM = {
  utm_source: 'unplugged_pack',
  utm_medium: 'qr',
  utm_campaign: 'kahoot_classic_unplugged_foil',
} as const;

export interface UnpluggedReteachPrintablePackLabels extends MissedWordsPracticeSheetLabels {
  /** Cover eyebrow / pack name */
  packTitle: string;
  /** Cover subtitle under the title */
  packSubtitle: string;
  /** Foil line (Kahoot Classic Unplugged) */
  packFoil: string;
  /** Label above the QR */
  qrHint: string;
  /** Short how-to on the cover */
  packHowTo: string;
  /** Section heading for the student practice pages */
  practiceHeading: string;
}

export interface UnpluggedReteachPrintablePackInput {
  lesson: string;
  teacher?: string;
  missedWords: string[];
  found?: number;
  total?: number;
  /** Affects `dir` on the printed document (`he` → rtl). */
  locale?: string;
  labels: UnpluggedReteachPrintablePackLabels;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function sanitizeText(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function isPayload(
  value: ClassGapShareInput | ClassGapSharePayload,
): value is ClassGapSharePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'lesson' in value &&
    typeof (value as ClassGapSharePayload).lesson === 'string' &&
    Array.isArray((value as ClassGapSharePayload).missedWords) &&
    !('lessonNames' in value)
  );
}

/** Absolute Unplugged Live URL with pack QR UTMs (analytics + deep-link). */
export function buildUnpluggedReteachPackLiveUrl(
  input: ClassGapShareInput | ClassGapSharePayload,
): string {
  const base = buildUnpluggedReteachUrl(input);
  const url = new URL(base);
  url.searchParams.set('utm_source', UNPLUGGED_PACK_QR_UTM.utm_source);
  url.searchParams.set('utm_medium', UNPLUGGED_PACK_QR_UTM.utm_medium);
  url.searchParams.set('utm_campaign', UNPLUGGED_PACK_QR_UTM.utm_campaign);
  return url.toString();
}

/**
 * Printable QR image URL encoding the Unplugged Live deep-link.
 * Uses goQR (api.qrserver.com) so the pack HTML stays dependency-free / SSR-safe.
 */
export function buildUnpluggedReteachPackQrImageUrl(
  liveUrl: string,
  size = 220,
): string {
  const safeSize = Math.max(80, Math.min(Math.floor(size) || 220, 400));
  const u = new URL('https://api.qrserver.com/v1/create-qr-code/');
  u.searchParams.set('size', `${safeSize}x${safeSize}`);
  u.searchParams.set('ecc', 'M');
  u.searchParams.set('margin', '8');
  u.searchParams.set('data', liveUrl);
  return u.toString();
}

/**
 * Build a self-contained print/PDF pack: cover (QR → Live) + #957-style practice pages.
 * Returns null when there are no printable missed words.
 */
export function buildUnpluggedReteachPrintablePackHtml(
  input: UnpluggedReteachPrintablePackInput,
): string | null {
  const words = normalizeMissedWordsForSheet(input.missedWords);
  if (words.length === 0) return null;

  const locale = (input.locale || 'en').toLowerCase().split('-')[0];
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const lesson = sanitizeText(input.lesson || '', 80) || 'Lesson';
  const teacher = input.teacher ? sanitizeText(input.teacher, 40) : '';
  const L = input.labels;

  const payloadInput: ClassGapShareInput = {
    locale,
    lessonNames: lesson ? [lesson] : [],
    teacherName: teacher,
    found: typeof input.found === 'number' ? input.found : 0,
    total: typeof input.total === 'number' ? input.total : words.length,
    missedWords: words,
  };
  const liveUrl = buildUnpluggedReteachPackLiveUrl(payloadInput);
  const qrSrc = buildUnpluggedReteachPackQrImageUrl(liveUrl);

  const wordChips = words
    .map((w) => `<li class="chip">${escapeHtml(w)}</li>`)
    .join('');

  const practiceRows = words
    .map((word, i) => {
      const w = escapeHtml(word);
      return `<section class="word" data-word="${w}">
  <h2><span class="n">${i + 1}.</span> ${w}</h2>
  <p class="prompt">${escapeHtml(L.writeLabel)}</p>
  <div class="line" aria-hidden="true"></div>
  <p class="prompt">${escapeHtml(L.sentenceLabel)}</p>
  <div class="line wide" aria-hidden="true"></div>
  <div class="line wide" aria-hidden="true"></div>
</section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(L.packTitle)} — ${escapeHtml(lesson)}</title>
<style>
  @page { margin: 1.2cm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    color: #111;
    margin: 0;
    padding: 0;
    font-size: 12pt;
    line-height: 1.35;
  }
  .cover {
    break-after: page;
    page-break-after: always;
    min-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  header { margin-bottom: 1rem; border-bottom: 2px solid #111; padding-bottom: 0.75rem; }
  h1 { font-size: 20pt; margin: 0 0 0.25rem; }
  .sub { margin: 0.2rem 0; color: #333; font-size: 11pt; }
  .foil {
    margin: 0.75rem 0 0;
    padding: 0.5rem 0.65rem;
    background: #f3f4f6;
    border: 1px solid #111;
    font-size: 10pt;
    font-weight: 600;
  }
  .meta { margin: 0.75rem 0 0; display: flex; gap: 2rem; flex-wrap: wrap; font-size: 11pt; }
  .chips { list-style: none; padding: 0; margin: 0.75rem 0 0; display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .chip {
    border: 1.5px solid #111;
    border-radius: 0.35rem;
    padding: 0.2rem 0.55rem;
    font-weight: 700;
    font-size: 10.5pt;
  }
  .qr-block {
    margin-top: 1.25rem;
    padding: 1rem;
    border: 2px solid #111;
    text-align: center;
    break-inside: avoid;
  }
  .qr-block img {
    width: 220px;
    height: 220px;
    image-rendering: pixelated;
  }
  .qr-hint { margin: 0 0 0.75rem; font-weight: 700; font-size: 12pt; }
  .qr-url {
    margin: 0.75rem 0 0;
    font-size: 8.5pt;
    word-break: break-all;
    color: #333;
  }
  .howto { margin-top: 1rem; font-size: 10.5pt; color: #222; }
  .practice-head { margin: 0 0 0.75rem; font-size: 16pt; }
  .word { break-inside: avoid; margin: 0 0 1.1rem; padding-bottom: 0.4rem; border-bottom: 1px dashed #bbb; }
  .word h2 { font-size: 13pt; margin: 0 0 0.35rem; }
  .word .n { font-weight: 700; margin-inline-end: 0.35rem; }
  .prompt { margin: 0.35rem 0 0.15rem; font-size: 10pt; color: #444; }
  .line {
    border-bottom: 1.5px solid #222;
    height: 1.35rem;
    margin: 0.15rem 0 0.35rem;
    max-width: 14rem;
  }
  .line.wide { max-width: 100%; }
  footer {
    margin-top: auto;
    padding-top: 0.75rem;
    border-top: 1px solid #999;
    font-size: 9pt;
    color: #555;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body data-testid="unplugged-reteach-printable-pack">
<section class="cover" data-testid="unplugged-reteach-pack-cover">
  <header>
    <h1>${escapeHtml(L.packTitle)}</h1>
    <p class="sub">${escapeHtml(L.packSubtitle)}</p>
    <p class="sub"><strong>${escapeHtml(lesson)}</strong>${teacher ? ` · ${escapeHtml(teacher)}` : ''}</p>
    <p class="foil">${escapeHtml(L.packFoil)}</p>
  </header>
  <ul class="chips" data-testid="unplugged-reteach-pack-words">${wordChips}</ul>
  <div class="qr-block" data-testid="unplugged-reteach-pack-qr">
    <p class="qr-hint">${escapeHtml(L.qrHint)}</p>
    <img src="${escapeHtml(qrSrc)}" width="220" height="220" alt="${escapeHtml(L.qrHint)}" />
    <p class="qr-url" data-testid="unplugged-reteach-pack-live-url">${escapeHtml(liveUrl)}</p>
  </div>
  <p class="howto">${escapeHtml(L.packHowTo)}</p>
  <footer>${escapeHtml(L.footer)}</footer>
</section>
<section class="practice" data-testid="unplugged-reteach-pack-practice">
  <header>
    <h1 class="practice-head">${escapeHtml(L.practiceHeading)}</h1>
    <p class="sub">${escapeHtml(L.subtitle)}</p>
    <p class="sub"><strong>${escapeHtml(lesson)}</strong>${teacher ? ` · ${escapeHtml(teacher)}` : ''}</p>
    <div class="meta">
      <span>${escapeHtml(L.nameLine)}</span>
      <span>${escapeHtml(L.dateLine)}</span>
    </div>
  </header>
  <main>
${practiceRows}
  </main>
  <footer>${escapeHtml(L.footer)}</footer>
</section>
<script>
window.addEventListener('load', function () {
  try { window.focus(); window.print(); } catch (e) {}
});
</script>
</body>
</html>`;
}

/**
 * Open the printable pack in a new window and trigger print / Save as PDF.
 * Returns false if the popup was blocked or there were no words.
 */
export function openUnpluggedReteachPrintablePack(
  input: UnpluggedReteachPrintablePackInput,
): boolean {
  if (typeof window === 'undefined') return false;
  const html = buildUnpluggedReteachPrintablePackHtml(input);
  if (!html) return false;
  // Do not pass noopener/noreferrer in windowFeatures: Chromium then returns
  // null from window.open (or an opaque window), so document.write never runs and
  // teachers only get an about:blank tab. Open a writable blank window, drop
  // opener ourselves, then write the print HTML.
  const w = window.open('', '_blank');
  if (!w) return false;
  try {
    w.opener = null;
  } catch {
    /* ignore */
  }
  try {
    w.document.open();
    w.document.write(html);
    w.document.close();
  } catch {
    try {
      w.close();
    } catch {
      /* ignore */
    }
    return false;
  }
  return true;
}

/** Helper: build pack input payload fields from a class-gap shape. */
export function packFieldsFromClassGap(
  input: ClassGapShareInput | ClassGapSharePayload,
): Pick<UnpluggedReteachPrintablePackInput, 'lesson' | 'teacher' | 'missedWords' | 'found' | 'total' | 'locale'> {
  const payload = isPayload(input) ? input : toClassGapPayload(input);
  return {
    lesson: payload.lesson,
    teacher: payload.teacher,
    missedWords: payload.missedWords,
    found: payload.found,
    total: payload.total,
    locale: payload.locale,
  };
}
