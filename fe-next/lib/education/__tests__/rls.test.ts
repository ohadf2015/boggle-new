import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasLiveEnv = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const anonClient = () => createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

describe.skipIf(!hasLiveEnv)('teacher_access_requests RLS (live DB)', () => {
  it('anon CAN insert a new request', async () => {
    const sb = anonClient();
    const { error } = await sb.from('teacher_access_requests').insert({
      email: `rls-test-${Date.now()}@example.com`,
      full_name: 'RLS Test',
      role: 'teacher',
      locale: 'en',
      use_case: 'integration test for RLS policy',
    });
    expect(error).toBeNull();
  });

  it('anon CANNOT select rows', async () => {
    const sb = anonClient();
    const { data } = await sb.from('teacher_access_requests').select('*').limit(1);
    expect(data).toEqual([]);
  });

  it('anon CANNOT update rows', async () => {
    const sb = anonClient();
    const testEmail = `rls-update-test-${Date.now()}@example.com`;
    // 1. Insert a row as anon (allowed by RLS).
    const ins = await sb.from('teacher_access_requests').insert({
      email: testEmail,
      full_name: 'Update Test',
      role: 'teacher',
      locale: 'en',
      use_case: 'integration test for update RLS',
    });
    expect(ins.error).toBeNull();

    // 2. Try to update that same row as anon.
    const upd = await sb.from('teacher_access_requests')
      .update({ status: 'approved' })
      .eq('email', testEmail)
      .select();

    // 3. RLS should block: no error, but zero rows returned.
    expect(upd.data).toEqual([]);
  });
});
