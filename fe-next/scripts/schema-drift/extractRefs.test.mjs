import assert from 'node:assert/strict';
import test from 'node:test';
import { extractRefs } from './extractRefs.mjs';

test('collects from() and rpc() string literals', () => {
  const { tables, rpcs } = extractRefs(`
    await supabase.from('profiles').select('id');
    await supabase.from("daily_word_hunt_attempts").select('puzzle_date');
    await supabase.rpc('increment_profile_stats', { p_user_id: id });
  `);
  assert.deepEqual([...tables].sort(), ['daily_word_hunt_attempts', 'profiles']);
  assert.deepEqual([...rpcs], ['increment_profile_stats']);
});

test('ignores storage buckets and the increment update sentinel', () => {
  const { tables, rpcs } = extractRefs(`
    supabase.storage.from('avatars').upload(path, blob);
    await supabase.from('profiles').update({
      free_hints_available: supabase.rpc('increment', { x: 1 }),
    });
    await supabase.rpc('award_education_xp', { p_student_id: id });
  `);
  assert.deepEqual([...tables], ['profiles']);
  assert.deepEqual([...rpcs], ['award_education_xp']);
});

test('ignores dynamic names', () => {
  const { tables, rpcs } = extractRefs(`
    supabase.from(tableName).select('*');
    supabase.rpc(fn, args);
  `);
  assert.equal(tables.size, 0);
  assert.equal(rpcs.size, 0);
});
