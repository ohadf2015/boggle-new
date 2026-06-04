/**
 * Hebrew Brain Gym drill copy — quality regression guard.
 *
 * The drill briefing strings (persona/mission/benefit/coachTip/steps) had been
 * machine-translated and shipped with broken Hebrew: e.g. "Glimmer" → "זעזוע"
 * (concussion), "Shift" → "הנדה" (Honda), the non-word "שיידור", and broken
 * word order like "הזיכרון הטווח קצר". These were rewritten to native Hebrew.
 *
 * This guard reads the live he.js source and fails if any known-bad string
 * returns or the corrected personas disappear.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const he = readFileSync(join(__dirname, '../translations/he.js'), 'utf8');

const BANNED = [
  'זעזוע',                       // wrong "Glimmer" persona (= concussion)
  '"הנדה"',                      // wrong "Shift" persona (= Honda)
  'שיידור',                      // non-word
  'הזיכרון הטווח קצר',           // broken word order
  'כל קיום מאפס',                // "each existence resets" (mistranslated "each find")
  'זה יותר טוב דבוק',            // gibberish "it sticks better"
  'מהירות משפרת על פני דיוק',    // literal broken "speed improves over accuracy"
  'תוך כדי תזוזה',               // literal "on the fly"
];

describe('Hebrew brain drill copy quality', () => {
  for (const bad of BANNED) {
    it(`does not contain broken string: ${bad}`, () => {
      expect(he.includes(bad)).toBe(false);
    });
  }

  it('uses the corrected drill personas', () => {
    expect(he).toContain('"persona": "שיפט"');   // Shift
    expect(he).toContain('"persona": "ניצוץ"');  // Glimmer
  });
});
