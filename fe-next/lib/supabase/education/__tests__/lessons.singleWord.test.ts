import { vi } from 'vitest';
/**
 * The save helpers refuse multi-word terms before anything is written, so no
 * caller (editor, quick launch, word-goal homework) can store "Rely on".
 */
import { supabase as _supabase } from '@/lib/supabase';
import { createLesson, updateLesson } from '../lessons';
import { INVALID_TERMS_ERROR } from '@/lib/education/singleWordTerm';

const supabase = _supabase!;

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const lesson = {
  teacher_id: 't1',
  classroom_id: null,
  name: 'If you are reading this....',
  description: null,
  language: 'en' as const,
  is_public: false,
  source_game_code: null,
};

function chain() {
  const single = vi.fn().mockResolvedValue({ data: { id: 'l1' }, error: null });
  const select = vi.fn().mockReturnValue({ single });
  const eq = vi.fn().mockReturnValue({ select });
  const insert = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ insert, update });
  return { insert, update };
}

describe('lesson save helpers reject multi-word terms', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createLesson refuses "Rely on" and writes nothing', async () => {
    const { insert } = chain();
    const res = await createLesson({
      ...lesson,
      words: [{ word: 'rely', canIntegrate: true }, { word: 'Rely on', canIntegrate: false }],
    });
    expect(res.data).toBeNull();
    expect(res.error).toMatchObject({ code: INVALID_TERMS_ERROR });
    expect(res.error?.message).toContain('"Rely on"');
    expect(insert).not.toHaveBeenCalled();
  });

  it('createLesson saves a single-word list', async () => {
    const { insert } = chain();
    const res = await createLesson({ ...lesson, words: [{ word: 'rely', canIntegrate: true }] });
    expect(res.error).toBeNull();
    expect(insert).toHaveBeenCalled();
  });

  it('updateLesson refuses multi-word words but allows name-only edits', async () => {
    const { update } = chain();
    const bad = await updateLesson('l1', { words: [{ word: 'Hospice care', canIntegrate: false }] });
    expect(bad.error).toMatchObject({ code: INVALID_TERMS_ERROR });
    expect(update).not.toHaveBeenCalled();

    const ok = await updateLesson('l1', { name: 'Renamed' });
    expect(ok.error).toBeNull();
    expect(update).toHaveBeenCalledWith({ name: 'Renamed' });
  });
});
