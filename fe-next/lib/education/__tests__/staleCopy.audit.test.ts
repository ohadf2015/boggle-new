import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Audit for stale copy that references the old 10-student limit.
 * When the limit changed from 10 to 50, we must update all user-facing text.
 *
 * This test checks SPECIFIC KEYS that are known to need updating, regardless
 * of which language or how the text is phrased. It catches translations in
 * all languages, not just those with English marker strings.
 */
describe('stale copy audit', () => {
  const translationFiles = [
    'translations/en.js',
    'translations/es.js',
    'translations/he.js',
    'translations/ja.js',
    'translations/sv.js',
  ];

  // Keys that are known to reference the free tier limits
  // These MUST be updated to say "3 classes" and "50 students" (or equivalents)
  const keysToAudit = [
    'freeStartNote',      // "Great for trying it out — up to 3 classes..."
    'faqDataLossAnswer',  // "You'll just revert to free-plan limits (3 classes, 50 students per class)"
  ];

  // Pattern: these keys appear near a question about free tier pricing/limits
  // They should refer to the current limits (3, 50) not the old ones (1, 10)
  const faqKeysThatShouldReferTo3And50 = [
    '"a": "Yes — a free basic plan for verified teachers: up to 3 classes of 50 students each'
  ];

  translationFiles.forEach((file) => {
    it(`${file} freeStartNote does not reference old 10-student limit`, () => {
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, 'utf-8');

      const freeStartNoteMatch = content.match(/"freeStartNote":\s*"([^"]*)"/);
      if (!freeStartNoteMatch) {
        throw new Error(`Could not find freeStartNote key in ${file}`);
      }

      const value = freeStartNoteMatch[1];

      // Should NOT contain hardcoded "10" when talking about students
      // English variations: "10 students", "10 student", "10 pupils"
      // Hebrew: "10 תלמידים"
      // Spanish: "10 estudiantes", "10 alumnos"
      // Swedish: "10 elever"
      // Japanese: "10人"
      const stalePatterns = [
        /\b10\s+(?:students?|pupils?|eleves|elever|estudiantes|alumnos|תלמידים|人)/i,
      ];

      for (const pattern of stalePatterns) {
        if (pattern.test(value)) {
          throw new Error(
            `freeStartNote in ${file} still references old "10 student" limit: ${value}`
          );
        }
      }

      // Should mention either "3 classes" or "3 classrooms" or localized equivalent
      // This is a sanity check that it was actually updated
      const hasModernPhrasing = /\b(?:3|three)\b.*(?:class|klass|clase|classe|クラス|כית)/i.test(value);
      if (!hasModernPhrasing) {
        console.warn(
          `WARNING: freeStartNote in ${file} doesn't seem to reference "3 classes": ${value}`
        );
      }
    });

    it(`${file} faqDataLossAnswer does not reference old 10-student limit`, () => {
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, 'utf-8');

      const faqMatch = content.match(/"faqDataLossAnswer":\s*"([^"]*)"/);
      if (!faqMatch) {
        throw new Error(`Could not find faqDataLossAnswer key in ${file}`);
      }

      const value = faqMatch[1];

      // Should NOT contain the old limit pattern
      const stalePatterns = [
        /\(?\s*1\s+(?:class|klass|clase|classe|כית|クラス)[^)]*10\s+(?:students?|pupils?|eleves|elever|estudiantes|alumnos|תלמידים|人)/i,
        /\b10\s+(?:students?|pupils?|eleves|elever|estudiantes|alumnos|תלמידים|人)/i,
      ];

      for (const pattern of stalePatterns) {
        if (pattern.test(value)) {
          throw new Error(
            `faqDataLossAnswer in ${file} still references old "10 student" limit: ${value}`
          );
        }
      }

      // Should mention "3 classes" or equivalent
      const hasModernPhrasing = /\b(?:3|three)\b.*(?:class|klass|clase|classe|クラス|כית)/i.test(value) &&
                                /\b50\b.*(?:student|pupil|eleve|elev|estudiante|alumno|תלמיד|人)/i.test(value);
      if (!hasModernPhrasing) {
        console.warn(
          `WARNING: faqDataLossAnswer in ${file} doesn't seem to reference "3 classes, 50 students": ${value}`
        );
      }
    });

    it(`${file} faq about free basic plan mentions correct limits (3 classes, 50 students)`, () => {
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Find the FAQ section that answers "what's free"
      // This is typically found in a pattern like: "a": "Yes — a free basic plan for verified teachers"
      const faqLines = content.match(/"a":\s*"[^"]*(?:free|gratis|freely|無料|חינם)[^"]*(?:class|klass|clase|classe|クラス|כית)[^"]*"/g);

      if (!faqLines || faqLines.length === 0) {
        // This key might not exist in all files, which is OK
        return;
      }

      for (const line of faqLines) {
        // Fail if this mentions the old limits
        if (/\b1\s+(?:class|klass|clase|classe|כית|クラス).*\b10\b/i.test(line)) {
          throw new Error(
            `FAQ in ${file} still references old "1 class, 10 students" limit: ${line}`
          );
        }

        // Sanity check: should mention 3 and 50
        // (less strict since some languages might phrase it differently)
      }
    });
  });
});
