import { describe, it, expect } from 'vitest';
import { EMPTY_WORDCRAFT_FEED, reduceWordcraftFeed, wordTiles, type WordcraftFeed } from '../ProjectorWordcraftFeed';

const play = (username: string, word: string, score: number, lessonWord: string | null = null, bingo = false) => ({
  type: 'activity' as const,
  activity: { username, words: [{ word, score }], score, bingo, lessonWord },
});

describe('reduceWordcraftFeed', () => {
  it('Given the round starts, When init lands, Then every lesson word is listed unbuilt', () => {
    const s = reduceWordcraftFeed(EMPTY_WORDCRAFT_FEED, { type: 'init', targets: ['RAIN', 'CLOUD'] });
    expect(s.targets).toEqual([{ word: 'RAIN', built: false, by: null }, { word: 'CLOUD', built: false, by: null }]);
    expect(s.plays).toEqual([]);
  });

  it('Given a play that builds a lesson word, Then that word is ticked with who built it first and the play leads the feed', () => {
    let s = reduceWordcraftFeed(EMPTY_WORDCRAFT_FEED, { type: 'init', targets: ['RAIN', 'CLOUD'] });
    s = reduceWordcraftFeed(s, play('Maya', 'RAIN', 4, 'RAIN'));
    s = reduceWordcraftFeed(s, play('Noah', 'RAIN', 4, 'RAIN'));
    expect(s.targets[0]).toEqual({ word: 'RAIN', built: true, by: 'Maya' });
    expect(s.plays[0].username).toBe('Noah');
    expect(s.plays[1].username).toBe('Maya');
    expect(s.plays[0].key).not.toBe(s.plays[1].key);
  });

  it('Given a long race, Then the feed keeps only the newest plays', () => {
    let s: WordcraftFeed = EMPTY_WORDCRAFT_FEED;
    for (let i = 0; i < 20; i++) s = reduceWordcraftFeed(s, play(`P${i}`, 'AT', 2));
    expect(s.plays.length).toBeLessThanOrEqual(6);
    expect(s.plays[0].username).toBe('P19');
  });

  it('Given a projector reload mid-race, When projectorState lands, Then built flags come back and known builders are kept', () => {
    let s = reduceWordcraftFeed(EMPTY_WORDCRAFT_FEED, { type: 'init', targets: ['RAIN', 'CLOUD'] });
    s = reduceWordcraftFeed(s, play('Maya', 'RAIN', 4, 'RAIN'));
    s = reduceWordcraftFeed(s, { type: 'projectorState', targets: [{ word: 'RAIN', built: true }, { word: 'CLOUD', built: true }] });
    expect(s.targets).toEqual([{ word: 'RAIN', built: true, by: 'Maya' }, { word: 'CLOUD', built: true, by: null }]);
  });
});

describe('wordTiles', () => {
  it('Given a word and a language, Then each letter carries its Wordcraft tile value', () => {
    const tiles = wordTiles('QUIZ', 'en');
    expect(tiles.map((x) => x.letter)).toEqual(['Q', 'U', 'I', 'Z']);
    expect(tiles[0].value).toBeGreaterThan(tiles[1].value);
  });

  it('Given a Hebrew word, Then its last letter shows in final form while keeping the tile value', () => {
    const tiles = wordTiles('עננ', 'he');
    expect(tiles.map((x) => x.letter).join('')).toBe('ענן');
    expect(tiles[2].value).toBe(tiles[1].value);
  });

  it('Given a Hebrew word already spelled with a final letter, Then that tile keeps its base letter value', () => {
    const tiles = wordTiles('ענן', 'he');
    expect(tiles.map((x) => x.letter).join('')).toBe('ענן');
    expect(tiles[2].value).toBe(tiles[1].value);
    expect(tiles[2].value).toBeGreaterThan(0);
  });

  it('Given an unsupported language, Then letters still render with English values', () => {
    expect(wordTiles('AT', 'xx').map((x) => x.letter)).toEqual(['A', 'T']);
  });
});
