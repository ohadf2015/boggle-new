import { describe, it, expect } from 'vitest';
import {
  CEFR_LEVELS,
  DEMO_ROUND_SECONDS,
  cefrGlosses,
  cefrLessonPack,
  cefrList,
  findWordOnBoard,
  demoBoard,
  practiceHref,
} from '../eslCefrDemo';

describe('eslCefrDemo', () => {
  it('ships a 12-word starter list with en+es glosses for every level', () => {
    for (const level of CEFR_LEVELS) {
      const glosses = cefrGlosses(level);
      expect(glosses.length).toBe(12);
      expect(cefrList(level)).toEqual(glosses.map((g) => g.word));
      for (const g of glosses) {
        expect(g.word.length).toBeGreaterThan(0);
        expect(g.en.length).toBeGreaterThan(0);
        expect(g.es.length).toBeGreaterThan(0);
      }
    }
  });

  it('practiceHref carries only the cefr param classroom-game honours', () => {
    expect(practiceHref('A2', 'es')).toBe('/es/education/classroom-game?cefr=A2');
    expect(practiceHref('B1', 'en')).not.toContain('mode=');
  });

  it('builds a stable-named starter pack so repeat visits dedupe on name', () => {
    const a = cefrLessonPack('A1');
    const b = cefrLessonPack('A1');
    expect(a.name).toBe('CEFR A1 Starter (ESL)');
    expect(a.name).toBe(b.name);
    expect(a.language).toBe('en');
    expect(a.words.length).toBe(12);
    for (const w of a.words) {
      expect(w.difficulty).toBe('easy');
      expect(w.definition.length).toBeGreaterThan(0);
    }
    expect(cefrLessonPack('A2').words.every((w) => w.difficulty === 'medium')).toBe(true);
    expect(cefrLessonPack('B1').words.every((w) => w.difficulty === 'hard')).toBe(true);
  });

  it('every board target is actually traceable on its board', () => {
    for (const level of CEFR_LEVELS) {
      const board = demoBoard(level);
      for (const target of board.targets) {
        expect(findWordOnBoard(board.letters, target)).not.toBeNull();
      }
    }
  });

  it('the demo round length matches the 60-second copy promise', () => {
    expect(DEMO_ROUND_SECONDS).toBe(60);
  });
});
