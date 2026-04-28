/**
 * Validates that SubmitWordSchema constrains comboType to the canonical
 * BlastComboType enum, preventing arbitrary string injection over socket.
 *
 * Audit ref: BLT-VAL-1 (blast MP audit 2026-04-28)
 */
import { SubmitWordSchema } from '../socketSchemas';
import { BLAST_COMBO_TYPES } from '../../types/blast';

describe('SubmitWordSchema.comboType', () => {
  const baseValid = { word: 'cat' };

  it('accepts every canonical BlastComboType', () => {
    for (const t of BLAST_COMBO_TYPES) {
      const result = SubmitWordSchema.safeParse({ ...baseValid, comboType: t });
      expect(result.success).toBe(true);
    }
  });

  it('accepts null comboType (no combo present)', () => {
    expect(SubmitWordSchema.safeParse({ ...baseValid, comboType: null }).success).toBe(true);
  });

  it('accepts omitted comboType', () => {
    expect(SubmitWordSchema.safeParse(baseValid).success).toBe(true);
  });

  it('rejects arbitrary string comboType', () => {
    expect(SubmitWordSchema.safeParse({ ...baseValid, comboType: 'fake_combo' }).success).toBe(false);
  });

  it('rejects empty string comboType', () => {
    expect(SubmitWordSchema.safeParse({ ...baseValid, comboType: '' }).success).toBe(false);
  });

  it('rejects non-string comboType', () => {
    expect(SubmitWordSchema.safeParse({ ...baseValid, comboType: 42 }).success).toBe(false);
    expect(SubmitWordSchema.safeParse({ ...baseValid, comboType: { type: 'bomb_bomb' } }).success).toBe(false);
  });
});

describe('BLAST_COMBO_TYPES canonical list', () => {
  it('contains 27 entries matching the BlastComboType union', () => {
    expect(BLAST_COMBO_TYPES).toHaveLength(27);
  });

  it('contains all special fallback combos', () => {
    expect(BLAST_COMBO_TYPES).toContain('gold_special');
    expect(BLAST_COMBO_TYPES).toContain('rainbow_special');
    expect(BLAST_COMBO_TYPES).toContain('triple_special');
  });

  it('has no duplicates', () => {
    const unique = new Set(BLAST_COMBO_TYPES);
    expect(unique.size).toBe(BLAST_COMBO_TYPES.length);
  });
});
