import { describe, expect, it } from 'vitest';
import { assertDisposableSupabase, isHostedSupabaseUrl } from '../../../scripts/disposableSupabase.mjs';

describe('verify-teacher-funnel prod guard', () => {
  it('refuses the LexiClash hosted Supabase URL', () => {
    expect(isHostedSupabaseUrl('https://hdtmpkicuxvtmvrmtybx.supabase.co')).toBe(true);
    expect(isHostedSupabaseUrl('https://eirtzbmukgcmxqsngueg.supabase.co')).toBe(true);
    expect(() => assertDisposableSupabase('https://hdtmpkicuxvtmvrmtybx.supabase.co')).toThrow(/refusing/);
  });

  it('allows the harness loopback Postgres', () => {
    expect(isHostedSupabaseUrl('http://127.0.0.1:54321')).toBe(false);
    expect(() => assertDisposableSupabase('http://127.0.0.1:54321')).not.toThrow();
  });
});
