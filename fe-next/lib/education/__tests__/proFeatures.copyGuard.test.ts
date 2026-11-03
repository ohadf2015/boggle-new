import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..');
const EDU = join(ROOT, 'app', '[locale]', 'education');

/**
 * Public copy that describes the plans. Lines the SEO-freeze CI treats as title/description
 * (scripts/ci/seo-freeze/violations.mjs SNIPPET_LINE) are skipped: they change on their own schedule.
 */
const BODY_FILES = [
  join(EDU, 'seoContent.ts'),
  join(EDU, 'esl-word-games', 'content.ts'),
  join(EDU, 'vocabulary-games-classroom', 'content.ts'),
  join(EDU, 'games-for-teachers', 'content.ts'),
  join(EDU, 'for-schools', 'content.ts'),
  join(ROOT, 'components', 'education', 'ProFramingSection.tsx'),
  join(ROOT, 'components', 'education', 'EducationHero.tsx'),
  join(ROOT, 'components', 'education', 'TeacherProCompareCheckoutStrip.tsx'),
];

const SNIPPET_KEY = /(title|description)\w*['"]?\s*(:|=(?![{"'=]))/i;

/** Lines of a file minus frozen snippet fields (a key whose string sits on the next line is skipped too). */
function bodyLines(file: string): Array<{ n: number; text: string }> {
  const lines = readFileSync(file, 'utf8').split('\n');
  const out: Array<{ n: number; text: string }> = [];
  let skipNext = false;
  lines.forEach((text, i) => {
    if (skipNext) {
      skipNext = false;
      return;
    }
    if (SNIPPET_KEY.test(text)) {
      skipNext = /(title|description)\w*\s*:\s*$/i.test(text);
      return;
    }
    if (/^\s*(\/\/|\*|\/\*)/.test(text)) return;
    out.push({ n: i + 1, text });
  });
  return out;
}

function hits(pattern: RegExp, files = BODY_FILES): string[] {
  return files.flatMap((f) =>
    bodyLines(f)
      .filter(({ text }) => pattern.test(text))
      .map(({ n, text }) => `${f.slice(ROOT.length)}:${n}: ${text.trim().slice(0, 120)}`),
  );
}

describe('plan copy tells one truth', () => {
  it('never says students need an account (they join with a code)', () => {
    const accounts =
      /student accounts?\s+(are\s+)?(always\s+)?(free|required)|free student accounts|free accounts\.|accounts are required|Yes, but it's free and takes 30 seconds|חשבונות תלמידים חינמיים|cuentas de estudiantes gratis|studentkonton|elevkonton (är )?gratis|無料の生徒アカウント|бесплатные ученические аккаунты/i;
    expect(hits(accounts)).toEqual([]);
  });

  it('never promises unlimited students (live games cap every plan)', () => {
    expect(hits(/unlimited students|rosterPro/i)).toEqual([]);
  });

  it('never types a price, trial length or school price', () => {
    expect(hits(/\$\s?(9|49)\b|\b9 ?(\$|USD)|9ドル|\b14-day\b|\b14 días\b|\b14 dagar\b|14 ימי|14日間|14 дней/)).toEqual([]);
  });

  it('does not sell duels in the plan copy', () => {
    const planFiles = [join(EDU, 'seoContent.ts'), join(EDU, 'for-schools', 'content.ts')];
    expect(hits(/duel|duelo|duell|דו-קרב|דו קרב|対戦デュエル|デュエル|дуэл/i, planFiles)).toEqual([]);
  });
});
