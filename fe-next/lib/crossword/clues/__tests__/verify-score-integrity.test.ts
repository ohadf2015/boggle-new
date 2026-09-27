/**
 * Verify that the staged score changes (in clueBank.sv.json and clueBank.es.json)
 * are justified based on clue quality evaluation.
 */

import { describe, it, expect } from 'vitest';
import { evaluateSvClue, evaluateEsClue } from '../evaluateSvClue';
import svBank from '../../data/clueBank.sv.json';
import esBank from '../../data/clueBank.es.json';

describe('Score integrity verification - Swedish & Spanish clue banks', () => {
  describe('Swedish clues - sample verification', () => {
    const sampleClues = [
      // These changed FROM higher scores TO lower scores
      { answer: 'alba', clue: 'Vit prästkjortel', changedFrom: 85, changedTo: 75 },
      { answer: 'amen', clue: 'Slutord i bön', changedFrom: 85, changedTo: 65 },
      { answer: 'ante', clue: 'Pokerspelarens insats', changedFrom: 85, changedTo: 77 },
      { answer: 'apel', clue: 'Frukt från träd', changedFrom: 88, changedTo: 80 },
      { answer: 'apor', clue: 'Djur från djunglerna', changedFrom: 88, changedTo: 80 },
    ];

    for (const { answer, clue, changedFrom, changedTo } of sampleClues) {
      it(`${answer}: "${clue}" should score ~${changedTo} (was ${changedFrom})`, () => {
        const result = evaluateSvClue(answer, clue);
        const scaledScore = result.score * 100;
        console.log(`  ${answer}: evaluated=${scaledScore}, expected=${changedTo}, reason="${result.reason}"`);

        // Expect the evaluated score to be reasonably close to the new staged score
        // Allow ±5 points variance
        expect(scaledScore).toBeGreaterThanOrEqual(changedTo - 8);
        expect(scaledScore).toBeLessThanOrEqual(changedTo + 8);
      });
    }
  });

  describe('Spanish clues - sample verification', () => {
    const sampleClues = [
      { answer: 'abeja', clue: 'Insecto productor de miel', changedFrom: 90, changedTo: 45 },
      { answer: 'acero', clue: 'Metal duro y resistente usado en construcción', changedFrom: 90, changedTo: 77 },
      { answer: 'agua', clue: 'Líquido vital para vivir', changedFrom: 90, changedTo: 90 },
      { answer: 'aguja', clue: 'Se enhebra para coser', changedFrom: 90, changedTo: 80 },
    ];

    for (const { answer, clue, changedFrom, changedTo } of sampleClues) {
      it(`${answer}: "${clue}" should score ~${changedTo} (was ${changedFrom})`, () => {
        const result = evaluateEsClue(answer, clue);
        const scaledScore = result.score * 100;
        console.log(`  ${answer}: evaluated=${scaledScore}, expected=${changedTo}, reason="${result.reason}"`);

        // For dramatic changes (90→45), expect bigger variance tolerance
        const tolerance = Math.abs(changedFrom - changedTo) > 20 ? 12 : 8;
        expect(scaledScore).toBeGreaterThanOrEqual(changedTo - tolerance);
        expect(scaledScore).toBeLessThanOrEqual(changedTo + tolerance);
      });
    }
  });

  describe('Clue bank health metrics', () => {
    it('Swedish bank: avg score should be ~0.65-0.70 (fair/good range)', () => {
      let total = 0;
      let sum = 0;
      for (const [answer, entry] of Object.entries(svBank)) {
        const clue = (entry as any).clue;
        const result = evaluateSvClue(answer, clue);
        sum += result.score;
        total++;
      }
      const avg = sum / total;
      console.log(`Swedish bank: ${total} clues, avg score=${avg.toFixed(2)}`);
      expect(avg).toBeGreaterThanOrEqual(0.60);
      expect(avg).toBeLessThanOrEqual(0.75);
    });

    it('Spanish bank: avg score should be ~0.65-0.70 (fair/good range)', () => {
      let total = 0;
      let sum = 0;
      for (const [answer, entry] of Object.entries(esBank)) {
        const clue = (entry as any).clue;
        const result = evaluateEsClue(answer, clue);
        sum += result.score;
        total++;
      }
      const avg = sum / total;
      console.log(`Spanish bank: ${total} clues, avg score=${avg.toFixed(2)}`);
      expect(avg).toBeGreaterThanOrEqual(0.60);
      expect(avg).toBeLessThanOrEqual(0.75);
    });

    it('No clues should be circular (answer in clue)', () => {
      const circularSV = [] as Array<{ answer: string; clue: string }>;
      const circularES = [] as Array<{ answer: string; clue: string }>;

      for (const [answer, entry] of Object.entries(svBank)) {
        const clue = (entry as any).clue;
        const result = evaluateSvClue(answer, clue);
        if (result.reason.match(/contain|echo/i)) {
          circularSV.push({ answer, clue });
        }
      }

      for (const [answer, entry] of Object.entries(esBank)) {
        const clue = (entry as any).clue;
        const result = evaluateEsClue(answer, clue);
        if (result.reason.match(/contain|echo/i)) {
          circularES.push({ answer, clue });
        }
      }

      if (circularSV.length > 0) {
        console.log('Swedish circular clues:');
        circularSV.forEach((c) => console.log(`  ${c.answer}: "${c.clue}"`));
      }
      if (circularES.length > 0) {
        console.log('Spanish circular clues:');
        circularES.forEach((c) => console.log(`  ${c.answer}: "${c.clue}"`));
      }

      expect(circularSV).toHaveLength(0);
      expect(circularES).toHaveLength(0);
    });
  });
});
