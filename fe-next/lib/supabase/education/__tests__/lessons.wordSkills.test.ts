import { vi } from 'vitest';
/**
 * The word shape reaches the database intact.
 *
 * `meanings` and `morphology` live inside the schemaless
 * `vocabulary_lessons.words` JSONB, so there is no column and no schema error
 * to catch a helper that rebuilds each word field by field. If one ever did,
 * a teacher would fill in the new fields, every unit test would stay green,
 * and the data would vanish on reload. This test locks the pass-through.
 */
import { supabase as _supabase } from '@/lib/supabase';
import { createLesson, updateLesson } from '../lessons';
import type { VocabularyWord } from '../types';

const supabase = _supabase!;

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const RICH_WORD: VocabularyWord = {
  word: 'bank',
  definition: 'a place that keeps money',
  canIntegrate: true,
  level: 'core',
  synonyms: ['shore'],
  antonyms: ['middle'],
  example: 'We sat on the ___ of the river.',
  meanings: ['the land beside a river', 'a place that keeps money'],
  morphology: { root: 'banc', rootMeaning: 'bench' },
};

function insertChain() {
  const single = vi.fn().mockResolvedValue({ data: { id: 'l1' }, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert });
  return insert;
}

function updateChain() {
  const single = vi.fn().mockResolvedValue({ data: { id: 'l1' }, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ update });
  return update;
}

describe('lesson word persistence keeps the practice-skill fields', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createLesson writes meanings and morphology through untouched', async () => {
    const insert = insertChain();
    await createLesson({
      teacher_id: 't1',
      classroom_id: null,
      name: 'Unit 3',
      description: null,
      language: 'en',
      words: [RICH_WORD],
      is_public: false,
      source_game_code: null,
    });
    const written = insert.mock.calls[0][0].words[0];
    expect(written).toEqual(RICH_WORD);
    expect(written.meanings).toEqual(['the land beside a river', 'a place that keeps money']);
    expect(written.morphology).toEqual({ root: 'banc', rootMeaning: 'bench' });
  });

  it('updateLesson writes meanings and morphology through untouched', async () => {
    const update = updateChain();
    await updateLesson('l1', { words: [RICH_WORD] });
    const written = update.mock.calls[0][0].words[0];
    expect(written).toEqual(RICH_WORD);
    expect(written.morphology).toEqual({ root: 'banc', rootMeaning: 'bench' });
  });
});
