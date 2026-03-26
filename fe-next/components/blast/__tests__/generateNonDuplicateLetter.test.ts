import { generateNonDuplicateLetter } from '../utils/blastGravity';

// Mock the letter generator so we can control return values
vi.mock('../utils/blastLetterGenerator', () => ({
  generateBlastLetter: vi.fn(),
  rollSpecialType: vi.fn(() => 'standard' as const),
}));

import { generateBlastLetter } from '../utils/blastLetterGenerator';
const mockGenerate = generateBlastLetter as jest.MockedFunction<typeof generateBlastLetter>;

describe('generateNonDuplicateLetter', () => {
  afterEach(() => vi.clearAllMocks());

  it('should return first letter when it differs from neighbor', () => {
    mockGenerate.mockReturnValue('B');
    const result = generateNonDuplicateLetter('en', Math.random, 'A', 3);
    expect(result).toBe('B');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('should retry when letter matches neighbor', () => {
    mockGenerate
      .mockReturnValueOnce('A') // same as neighbor
      .mockReturnValueOnce('A') // same again
      .mockReturnValueOnce('B'); // different
    const result = generateNonDuplicateLetter('en', Math.random, 'A', 3);
    expect(result).toBe('B');
    expect(mockGenerate).toHaveBeenCalledTimes(3);
  });

  it('should accept duplicate after exhausting retries', () => {
    mockGenerate.mockReturnValue('A'); // always same
    const result = generateNonDuplicateLetter('en', Math.random, 'A', 3);
    // 1 initial + 3 retries = 4 calls total
    expect(result).toBe('A');
    expect(mockGenerate).toHaveBeenCalledTimes(4);
  });

  it('should use provided rng function', () => {
    const rng = vi.fn(() => 0.5);
    mockGenerate.mockReturnValue('C');
    generateNonDuplicateLetter('he', rng, 'X', 2);
    expect(mockGenerate).toHaveBeenCalledWith('he', 1.0, rng);
  });
});
