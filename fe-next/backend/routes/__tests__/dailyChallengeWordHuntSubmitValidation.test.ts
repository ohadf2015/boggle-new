/**
 * Tests for Word Hunt Submit - Dictionary Validation Non-Blocking Behavior
 *
 * Bug reproduction: Dictionary validation in the submit handler blocks
 * submissions with 400 errors instead of being advisory (non-blocking).
 * When dictionary is unloaded, isDictionaryWord returns null, causing
 * isWordValidForDailyChallenge to return false, which blocks the submission.
 *
 * The fix: dictionary validation should be advisory - log warnings but
 * never block submission. Critical validations (target word mismatch,
 * puzzle number) should still block.
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { isWordValidForDailyChallenge } from '../dailyChallenge/utils';
import { isDictionaryWord } from '../../dictionary';
import { isWordCommunityValid } from '../../modules/communityWordManager';

vi.mock('../../dictionary');
vi.mock('../../modules/communityWordManager');

const mockIsDictionaryWord = isDictionaryWord as MockedFunction<typeof isDictionaryWord>;
const mockIsWordCommunityValid = isWordCommunityValid as MockedFunction<typeof isWordCommunityValid>;

describe('isWordValidForDailyChallenge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when word is in dictionary', () => {
    // GIVEN
    mockIsDictionaryWord.mockReturnValue(true);

    // WHEN
    const result = isWordValidForDailyChallenge('HELLO', 'en');

    // THEN
    expect(result).toBe(true);
    expect(mockIsDictionaryWord).toHaveBeenCalledWith('HELLO', 'en');
  });

  it('should return true when word is community-validated even if not in dictionary', () => {
    // GIVEN
    mockIsDictionaryWord.mockReturnValue(false);
    mockIsWordCommunityValid.mockReturnValue(true);

    // WHEN
    const result = isWordValidForDailyChallenge('SLANG', 'en');

    // THEN
    expect(result).toBe(true);
  });

  it('should return false when word is not in dictionary AND not community-validated', () => {
    // GIVEN
    mockIsDictionaryWord.mockReturnValue(false);
    mockIsWordCommunityValid.mockReturnValue(false);

    // WHEN
    const result = isWordValidForDailyChallenge('XYZZY', 'en');

    // THEN
    expect(result).toBe(false);
  });

  it('should return false when dictionary returns null (language not loaded) AND word is not community-validated', () => {
    // GIVEN - dictionary not loaded, returns null
    mockIsDictionaryWord.mockReturnValue(null);
    mockIsWordCommunityValid.mockReturnValue(false);

    // WHEN
    const result = isWordValidForDailyChallenge('משטח', 'he');

    // THEN - this is the CURRENT behavior that causes the bug
    // null !== true, so it falls through to community check, which also fails
    expect(result).toBe(false);
  });

  it('should return true when dictionary returns null but word IS community-validated', () => {
    // GIVEN - dictionary not loaded, but community has validated the word
    mockIsDictionaryWord.mockReturnValue(null);
    mockIsWordCommunityValid.mockReturnValue(true);

    // WHEN
    const result = isWordValidForDailyChallenge('משטח', 'he');

    // THEN
    expect(result).toBe(true);
  });
});
