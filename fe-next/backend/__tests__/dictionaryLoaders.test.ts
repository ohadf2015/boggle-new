import { loadNounList, SafeReadFile } from '../dictionaryLoaders';

describe('loadNounList', () => {
  const mockSafeReadFile: SafeReadFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty set when file does not exist', async () => {
    (mockSafeReadFile as ReturnType<typeof vi.fn>).mockResolvedValue('');
    const result = await loadNounList(mockSafeReadFile, 'en');
    expect(result.size).toBe(0);
  });

  it('should load words from file and normalize to lowercase', async () => {
    (mockSafeReadFile as ReturnType<typeof vi.fn>).mockResolvedValue('Apple\nBanana\nCherry\n');
    const result = await loadNounList(mockSafeReadFile, 'en');
    expect(result).toEqual(new Set(['apple', 'banana', 'cherry']));
  });

  it('should skip empty lines', async () => {
    (mockSafeReadFile as ReturnType<typeof vi.fn>).mockResolvedValue('cat\n\ndog\n\n');
    const result = await loadNounList(mockSafeReadFile, 'en');
    expect(result).toEqual(new Set(['cat', 'dog']));
  });

  it('should deduplicate words', async () => {
    (mockSafeReadFile as ReturnType<typeof vi.fn>).mockResolvedValue('cat\nCat\nCAT\n');
    const result = await loadNounList(mockSafeReadFile, 'en');
    expect(result).toEqual(new Set(['cat']));
  });

  it('should use custom normalizer when provided', async () => {
    (mockSafeReadFile as ReturnType<typeof vi.fn>).mockResolvedValue('word1\nword2\n');
    const customNormalizer = (w: string) => w.trim().toUpperCase();
    const result = await loadNounList(mockSafeReadFile, 'en', customNormalizer);
    expect(result).toEqual(new Set(['WORD1', 'WORD2']));
  });

  it('should construct correct file path using language code', async () => {
    (mockSafeReadFile as ReturnType<typeof vi.fn>).mockResolvedValue('');
    await loadNounList(mockSafeReadFile, 'he');
    expect(mockSafeReadFile).toHaveBeenCalledWith(
      expect.stringContaining('he_nouns.txt')
    );
  });
});
