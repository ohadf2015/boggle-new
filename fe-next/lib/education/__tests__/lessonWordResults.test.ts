import { describe, it, expect } from 'vitest';
import { foundWordResults, wordCraftWordResults } from '../lessonWordResults';

describe('foundWordResults', () => {
  it('Given board-cased finds, When mapped, Then each lesson word is reported once in the teacher spelling', () => {
    expect(foundWordResults(['CAT', 'cat', 'SUN'], ['Cat', 'dog'], 'en')).toEqual([
      { word: 'Cat', correct: true, kind: 'find' },
    ]);
  });

  it('Given a Hebrew find without its final letter form, When mapped, Then the teacher spelling comes back', () => {
    expect(foundWordResults(['שלומ'], ['שלום'], 'he')).toEqual([{ word: 'שלום', correct: true, kind: 'find' }]);
  });

  it('Given nothing found, When mapped, Then there are no entries', () => {
    expect(foundWordResults([], ['cat'], 'en')).toEqual([]);
  });
});

describe('wordCraftWordResults', () => {
  it('Given built and dealt-but-unbuilt lesson words, When mapped, Then built are correct and missed are wrong', () => {
    expect(
      wordCraftWordResults({ lessonWords: ['cat', 'dog', 'tree', 'owl'], dealt: ['CAT', 'DOG', 'TREE'], built: ['CAT'], language: 'en' }),
    ).toEqual([
      { word: 'cat', correct: true, kind: 'find' },
      { word: 'dog', correct: false, kind: 'find' },
      { word: 'tree', correct: false, kind: 'find' },
    ]);
  });
});
