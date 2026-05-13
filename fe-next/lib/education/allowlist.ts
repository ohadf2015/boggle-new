import { createClient } from '@/utils/supabase/server';

export async function consumeTeacherAllowlist({ userId, email }: { userId: string; email: string }) {
  const sb = await createClient();
  const { data: row } = await sb
    .from('teacher_access_allowlist')
    .select('email')
    .eq('email', email.toLowerCase())
    .is('consumed_at', null)
    .maybeSingle();

  if (!row) return { consumed: false };

  await sb.from('profiles').update({ user_role: 'teacher' }).eq('id', userId);
  await sb.from('teacher_access_allowlist').update({
    consumed_at: new Date().toISOString(),
    consumed_by_user_id: userId,
  }).eq('email', row.email);

  return { consumed: true };
}
