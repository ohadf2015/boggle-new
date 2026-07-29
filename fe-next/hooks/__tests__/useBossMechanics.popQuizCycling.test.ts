/**
 * useBossMechanics — Bug C2: PopQuiz requirement index never cycles
 *
 * The mechanicState.currentRequirementIndex should increment after each
 * word evaluation so that PopQuiz rotates through requirement types.
 */

import { renderHook, act } from '@testing-library/react';
import { useBossMechanics } from '../useBossMechanics';

// World 1 boss uses popQuiz with requirementTypes:
// ['doubleLetters', 'startsWith', 'exactLength', 'containsVowel']
const WORLD_1 = 1;

describe('useBossMechanics — popQuiz requirement cycling', () => {
  it('should advance currentRequirementIndex after each checkWord call', () => {
    // GIVEN: World 1 boss (popQuiz mechanic)
    const { result } = renderHook(() =>
      useBossMechanics({ worldId: WORLD_1 })
    );

    // Initial state should have currentRequirementIndex = 0
    expect(result.current.bossState.mechanicState.currentRequirementIndex).toBe(0);

    // WHEN: first word is checked — must use act() so React flushes setBossState
    act(() => {
      result.current.checkWord('BOOK');
    });

    // THEN: requirement index should advance to 1
    expect(result.current.bossState.mechanicState.currentRequirementIndex).toBe(1);

    // WHEN: second word is checked
    act(() => {
      result.current.checkWord('PLAY');
    });

    // THEN: requirement index should advance to 2
    expect(result.current.bossState.mechanicState.currentRequirementIndex).toBe(2);

    // WHEN: third word is checked
    act(() => {
      result.current.checkWord('WORDS');
    });

    // THEN: requirement index should advance to 3
    expect(result.current.bossState.mechanicState.currentRequirementIndex).toBe(3);
  });

  it('should evaluate different requirements as index advances', () => {
    // GIVEN: World 1 boss
    const { result } = renderHook(() =>
      useBossMechanics({ worldId: WORLD_1 })
    );

    // Requirement 0: doubleLetters — "BOOK" has OO, should meet requirement
    let mechanicResult: ReturnType<typeof result.current.checkWord>;
    act(() => {
      mechanicResult = result.current.checkWord('BOOK');
    });
    expect(mechanicResult!.meetsRequirement).toBe(true); // double letters

    // Requirement 1: startsWith — "APPLE" starts with vowel, should NOT meet
    // (startsWith defaults to consonant check)
    act(() => {
      mechanicResult = result.current.checkWord('APPLE');
    });
    expect(mechanicResult!.meetsRequirement).toBe(false); // A is not a consonant

    // Requirement 2: exactLength — "WORDS" is 5 letters, should meet
    act(() => {
      mechanicResult = result.current.checkWord('WORDS');
    });
    expect(mechanicResult!.meetsRequirement).toBe(true); // exactly 5 letters

    // Requirement 3: containsVowel — "APPLE" has vowels and length >= 4
    act(() => {
      mechanicResult = result.current.checkWord('APPLE');
    });
    expect(mechanicResult!.meetsRequirement).toBe(true); // has vowel and >= 4 chars
  });
});
