import { describe, expect, it } from 'vitest';
import { assertDisposableSupabase, isHostedSupabaseUrl, stripHostedSupabaseEnv } from '../../../scripts/disposableSupabase.mjs';

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

  it('strips a hosted URL inherited from the shell so the harness cannot adopt prod', () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://hdtmpkicuxvtmvrmtybx.supabase.co',
      SUPABASE_URL: 'https://eirtzbmukgcmxqsngueg.supabase.co',
      DATABASE_URL: 'postgres://127.0.0.1:54322/postgres',
    };
    expect(stripHostedSupabaseEnv(env)).toEqual(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.DATABASE_URL).toBe('postgres://127.0.0.1:54322/postgres');
  });
});
