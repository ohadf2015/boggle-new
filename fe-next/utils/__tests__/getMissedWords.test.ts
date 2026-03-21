import { getMissedWords } from '../playerArchetypes';

describe('getMissedWords', () => {
  // Given-When-Then pattern per TDD rules

  it('should return words found by others but not by the player', () => {
    // Given: player found "cat", opponent found "cat" and "dog"
    const allPlayersWords = {
      player1: [
        { word: 'cat', validated: true, score: 3 },
      ],
      player2: [
        { word: 'cat', validated: true, score: 3 },
        { word: 'dog', validated: true, score: 3 },
      ],
    };

    // When: getMissedWords for player1
    const result = getMissedWords('player1', allPlayersWords, 10);

    // Then: only "dog" is missed (player found "cat")
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('dog');
    expect(result[0].foundBy).toEqual(['player2']);
  });

  it('should NOT show words player submitted even if they were invalidated (duplicates)', () => {
    // Given: player submitted "cat" but it was invalidated (duplicate rule)
    const allPlayersWords = {
      player1: [
        { word: 'cat', validated: false, score: 0 },
        { word: 'dog', validated: true, score: 3 },
      ],
      player2: [
        { word: 'cat', validated: true, score: 3 },
        { word: 'fish', validated: true, score: 5 },
      ],
    };

    // When: getMissedWords for player1
    const result = getMissedWords('player1', allPlayersWords, 10);

    // Then: "cat" should NOT appear as missed (player found it, just got invalidated)
    // Only "fish" should appear
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('fish');
    expect(result[0].foundBy).toEqual(['player2']);
  });

  it('should handle case-insensitive word matching', () => {
    // Given: player found "CAT", opponent found "cat"
    const allPlayersWords = {
      player1: [
        { word: 'CAT', validated: true, score: 3 },
      ],
      player2: [
        { word: 'cat', validated: true, score: 3 },
        { word: 'DOG', validated: true, score: 3 },
      ],
    };

    // When: getMissedWords for player1
    const result = getMissedWords('player1', allPlayersWords, 10);

    // Then: "cat"/"CAT" not missed, only "DOG" missed
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('dog');
  });

  it('should exclude player own words even with undefined validated field', () => {
    // Given: player has words without explicit validated field
    const allPlayersWords = {
      player1: [
        { word: 'cat', score: 3 },  // validated is undefined
      ],
      player2: [
        { word: 'cat', validated: true, score: 3 },
        { word: 'dog', validated: true, score: 3 },
      ],
    };

    // When: getMissedWords for player1
    const result = getMissedWords('player1', allPlayersWords, 10);

    // Then: "cat" should not be missed
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('dog');
  });

  it('should sort missed words by score descending', () => {
    // Given: opponent found multiple words with different scores
    const allPlayersWords = {
      player1: [],
      player2: [
        { word: 'cat', validated: true, score: 3 },
        { word: 'elephant', validated: true, score: 11 },
        { word: 'dogs', validated: true, score: 4 },
      ],
    };

    // When: getMissedWords for player1
    const result = getMissedWords('player1', allPlayersWords, 10);

    // Then: sorted by score descending
    expect(result.map(w => w.word)).toEqual(['elephant', 'dogs', 'cat']);
  });

  it('should respect the limit parameter', () => {
    // Given: many missed words
    const allPlayersWords = {
      player1: [],
      player2: [
        { word: 'a', validated: true, score: 1 },
        { word: 'b', validated: true, score: 2 },
        { word: 'c', validated: true, score: 3 },
        { word: 'd', validated: true, score: 4 },
        { word: 'e', validated: true, score: 5 },
      ],
    };

    // When: getMissedWords with limit=3
    const result = getMissedWords('player1', allPlayersWords, 3);

    // Then: only top 3 by score
    expect(result).toHaveLength(3);
    expect(result.map(w => w.word)).toEqual(['e', 'd', 'c']);
  });

  it('should aggregate foundBy across multiple opponents', () => {
    // Given: multiple opponents found the same word
    const allPlayersWords = {
      player1: [],
      player2: [{ word: 'cat', validated: true, score: 3 }],
      player3: [{ word: 'cat', validated: true, score: 3 }],
    };

    // When: getMissedWords for player1
    const result = getMissedWords('player1', allPlayersWords, 10);

    // Then: "cat" appears once with both finders
    expect(result).toHaveLength(1);
    expect(result[0].foundBy).toEqual(['player2', 'player3']);
  });

  it('should return empty array when player found all words', () => {
    // Given: player found every word that opponents found
    const allPlayersWords = {
      player1: [
        { word: 'cat', validated: true, score: 3 },
        { word: 'dog', validated: true, score: 3 },
      ],
      player2: [
        { word: 'cat', validated: true, score: 3 },
        { word: 'dog', validated: true, score: 3 },
      ],
    };

    // When: getMissedWords for player1
    const result = getMissedWords('player1', allPlayersWords, 10);

    // Then: nothing missed
    expect(result).toHaveLength(0);
  });

  it('should not include invalidated words from opponents', () => {
    // Given: opponent has an invalidated word
    const allPlayersWords = {
      player1: [],
      player2: [
        { word: 'cat', validated: true, score: 3 },
        { word: 'xyz', validated: false, score: 0 },
      ],
    };

    // When: getMissedWords for player1
    const result = getMissedWords('player1', allPlayersWords, 10);

    // Then: only validated words from opponents show as missed
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('cat');
  });
});
