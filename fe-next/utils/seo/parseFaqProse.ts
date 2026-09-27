// Parses FAQ prose written as `"Q?" A.` blocks separated by blank lines into
// structured Q/A pairs for FAQPage JSON-LD emission. Source content stays the
// only authored copy; this layer just exposes it to crawlers as schema.

export interface FaqQa {
  question: string;
  answer: string;
}

const QUOTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['"', '"'],          // ASCII straight (en/he/sv/es)
  ['“', '”'], // Curly double
  ['「', '」'], // Japanese 「 」
  ['«', '»'], // French « »
  ['„', '“'], // German „ "
];

// Question terminator characters across our 5 locales — covers ASCII `?`,
// full-width Japanese `？`, and Spanish closing `?` (the opening `¿` is part
// of the question body, not a terminator).
const QUESTION_TERMINATORS = /[?？]\s*$/;

function tryQuotedFormat(block: string): FaqQa | null {
  for (const [open, close] of QUOTE_PAIRS) {
    if (!block.startsWith(open)) continue;
    const closeIdx = block.indexOf(close, open.length);
    if (closeIdx === -1) continue;
    const question = block.slice(open.length, closeIdx).trim();
    const answer = block.slice(closeIdx + close.length).trim();
    if (question && answer) return { question, answer };
    return null;
  }
  return null;
}

function tryNewlineFormat(block: string): FaqQa | null {
  // First line ends with `?` / `？` → question. Remaining lines → answer.
  const firstNewline = block.indexOf('\n');
  if (firstNewline === -1) return null;
  const firstLine = block.slice(0, firstNewline).trim();
  const rest = block.slice(firstNewline + 1).trim();
  if (!QUESTION_TERMINATORS.test(firstLine)) return null;
  if (!rest) return null;
  return { question: firstLine, answer: rest };
}

function tryInlineFormat(block: string): FaqQa | null {
  // Single-line `Question? Answer.` blocks. Split on the first `?` / `？`,
  // keeping the terminator with the question. Skip if the answer side is
  // shorter than 5 chars (likely a question that just trails off, not a real
  // answer body).
  const match = block.match(/^([^\n]+?[?？])\s+(\S.*)$/s);
  if (!match) return null;
  const question = match[1].trim();
  const answer = match[2].trim();
  if (answer.length < 5) return null;
  return { question, answer };
}

export function parseFaqProse(content: string): FaqQa[] {
  if (!content) return [];
  const blocks = content.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const out: FaqQa[] = [];

  for (const block of blocks) {
    const qa = tryQuotedFormat(block) ?? tryNewlineFormat(block) ?? tryInlineFormat(block);
    if (qa) out.push(qa);
  }

  return out;
}

// Walks article sections and returns Q/A pairs from the FAQ section.
// Detection:
//   1. Fast path — section title contains the literal "FAQ" (English articles).
//   2. Fallback — scan every section's prose; pick the first that parses into
//      ≥2 Q/A pairs. Works across locales whose FAQ heading is `שאלות נפוצות`,
//      `よくある質問`, `Preguntas Frecuentes`, `Vanliga frågor`, etc., without
//      hard-coding a title dictionary per language.
const MIN_FAQ_PAIRS = 2;

export function extractFaqFromSections(
  sections: ReadonlyArray<{ title?: string; content: string }>,
): FaqQa[] {
  for (const section of sections) {
    if (section.title && /\bFAQ\b/i.test(section.title)) {
      const parsed = parseFaqProse(section.content);
      if (parsed.length >= MIN_FAQ_PAIRS) return parsed;
    }
  }
  // Fallback: pick the section with the MOST parsed Q/A pairs. Earlier prose
  // sometimes contains 2-3 rhetorical inline questions ("Why is that? Because…")
  // that look FAQ-like; the real FAQ section reliably yields more pairs.
  let best: FaqQa[] = [];
  for (const section of sections) {
    const parsed = parseFaqProse(section.content);
    if (parsed.length > best.length) best = parsed;
  }
  return best.length >= MIN_FAQ_PAIRS ? best : [];
}
