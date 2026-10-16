import type { SupabaseClient } from '@supabase/supabase-js';

export const CLASS_PREVIEW_LIMIT = 4;
export const CLASS_PREVIEW_MAX_CLASSES = 12;
// ponytail: one row budget for all classes, trimmed per class client-side; a per-class LATERAL RPC if classes outgrow it.
export const CLASS_PREVIEW_MAX_ROWS = 600;
const TIMEOUT_MS = 3_000;

/** First few student ids per class, for the avatar stack on the teacher home list. Throws on error or timeout. */
export async function fetchClassStudentPreview(
  client: Pick<SupabaseClient, 'from'>,
  classroomIds: readonly string[],
): Promise<Record<string, string[]>> {
  const ids = classroomIds.slice(0, CLASS_PREVIEW_MAX_CLASSES);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('class student preview timed out')), TIMEOUT_MS);
  });
  const read = client
    .from('classroom_memberships')
    .select('classroom_id, student_id')
    .in('classroom_id', ids)
    .order('joined_at', { ascending: true })
    .limit(CLASS_PREVIEW_MAX_ROWS);
  try {
    const { data, error } = await Promise.race([read, timeout]);
    if (error) throw new Error(error.message);
    const out: Record<string, string[]> = Object.fromEntries(ids.map((id) => [id, []]));
    for (const row of (data ?? []) as { classroom_id: string; student_id: string }[]) {
      const list = out[row.classroom_id];
      if (list && list.length < CLASS_PREVIEW_LIMIT) list.push(row.student_id);
    }
    return out;
  } finally {
    clearTimeout(timer);
  }
}
