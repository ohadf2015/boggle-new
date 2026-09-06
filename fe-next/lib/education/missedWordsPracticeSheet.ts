/**
 * Printable missed-words practice sheet — device-free reteach after Live.
 *
 * Foils Kahoot Classic Unplugged / Team Tiles: teacher prints the class gap
 * (missed words only — no student names) and hands out paper practice.
 * Extends class-gap share (#899) + reteach Live (#949) + GC assign (#954).
 *
 * Pure HTML builder is side-effect free (SSR / unit safe). Browser print opens
 * a blank window, writes the document, and triggers the print dialog.
 */

import { MAX_MISSED_WORDS, MAX_WORD_LENGTH } from './classGapShare';

export interface MissedWordsPracticeSheetLabels {
  title: string;
  subtitle: string;
  writeLabel: string;
  sentenceLabel: string;
  nameLine: string;
  dateLine: string;
  footer: string;
}

export interface MissedWordsPracticeSheetInput {
  lesson: string;
  teacher?: string;
  missedWords: string[];
  /** Affects `dir` on the printed document (`he` → rtl). */
  locale?: string;
  labels: MissedWordsPracticeSheetLabels;
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

/** Cap + sanitize missed words the same way class-gap share does (no names). */
export function normalizeMissedWordsForSheet(words: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of words || []) {
    const word = sanitizeText(String(raw || ''), MAX_WORD_LENGTH);
    if (!word) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
    if (out.length >= MAX_MISSED_WORDS) break;
  }
  return out;
}

/**
 * Build a self-contained print document. Caller supplies already-localised labels.
 * Returns null when there are no printable missed words.
 */
export function buildMissedWordsPracticeSheetHtml(
  input: MissedWordsPracticeSheetInput,
): string | null {
  const words = normalizeMissedWordsForSheet(input.missedWords);
  if (words.length === 0) return null;

  const locale = (input.locale || 'en').toLowerCase().split('-')[0];
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  const lesson = escapeHtml(sanitizeText(input.lesson || '', 80) || 'Lesson');
  const teacher = input.teacher
    ? escapeHtml(sanitizeText(input.teacher, 40))
    : '';
  const L = input.labels;

  const rows = words
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
<title>${escapeHtml(L.title)} — ${lesson}</title>
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
  header { margin-bottom: 1.25rem; border-bottom: 2px solid #111; padding-bottom: 0.75rem; }
  h1 { font-size: 18pt; margin: 0 0 0.25rem; }
  .sub { margin: 0; color: #333; font-size: 11pt; }
  .meta { margin: 0.75rem 0 0; display: flex; gap: 2rem; flex-wrap: wrap; font-size: 11pt; }
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
    margin-top: 1.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #999;
    font-size: 9pt;
    color: #555;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body data-testid="missed-words-practice-sheet">
<header>
  <h1>${escapeHtml(L.title)}</h1>
  <p class="sub">${escapeHtml(L.subtitle)}</p>
  <p class="sub"><strong>${lesson}</strong>${teacher ? ` · ${teacher}` : ''}</p>
  <div class="meta">
    <span>${escapeHtml(L.nameLine)}</span>
    <span>${escapeHtml(L.dateLine)}</span>
  </div>
</header>
<main>
${rows}
</main>
<footer>${escapeHtml(L.footer)}</footer>
<script>
window.addEventListener('load', function () {
  try { window.focus(); window.print(); } catch (e) {}
});
</script>
</body>
</html>`;
}

/**
 * Open the practice sheet in a new window and trigger print.
 * Returns false if the popup was blocked or there were no words.
 */
export function openMissedWordsPracticeSheet(
  input: MissedWordsPracticeSheetInput,
): boolean {
  if (typeof window === 'undefined') return false;
  const html = buildMissedWordsPracticeSheetHtml(input);
  if (!html) return false;
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return false;
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
