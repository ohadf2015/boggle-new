import { loadNounList, loadSpanishDictionary, SafeReadFile } from '../dictionaryLoaders';

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

describe('loadSpanishDictionary — accent-stripped at load, ñ preserved', () => {
  // The validation path normalizes input via normalizeSpanishWord (strips
  // accents, keeps ñ). The dictionary Set must be normalized the SAME way at
  // load, or community/auto-promoted accented words become unreachable: a word
  // promoted as "rápido" would store as "rápido" but every lookup normalizes to
  // "rapido" → permanent miss. Symmetric normalization is the fix.
  const noApproved: SafeReadFile = vi.fn().mockResolvedValue('');

  it('stores base ñ words intact (an-array-of-spanish-words preserves ñ)', async () => {
    const dict = await loadSpanishDictionary(noApproved);
    expect(dict.has('niño')).toBe(true);
    expect(dict.has('año')).toBe(true);
  });

  it('makes an accented approved word reachable via its normalized form', async () => {
    // "córner" is not in the base package; supplied via approved list with an
    // accent. After load-normalization it must be stored as "corner" so the
    // accent-stripped lookup hits.
    const approved: SafeReadFile = vi.fn().mockResolvedValue('córner\n');
    const dict = await loadSpanishDictionary(approved);
    expect(dict.has('corner')).toBe(true);
    expect(dict.has('córner')).toBe(false);
  });

  it('does not fold ñ in approved words to n', async () => {
    const approved: SafeReadFile = vi.fn().mockResolvedValue('zzñqx\n');
    const dict = await loadSpanishDictionary(approved);
    expect(dict.has('zzñqx')).toBe(true);
    expect(dict.has('zznqx')).toBe(false);
  });
});
