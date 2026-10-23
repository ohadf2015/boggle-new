import { NextResponse } from 'next/server';
import { createRequestClient } from '@/utils/supabase/server';
import { requireTeacherPro } from '@/lib/education/pro/requireTeacherPro';
import { readTeacherExportRows } from '@/lib/education/pro/teacherExportServer';

/** GET /api/education/classroom/export-all — Teacher Pro. 401 signed out, 402 not Pro, 500 read failed. */
export async function GET(req: Request) {
  const { supabase: sb, token } = await createRequestClient(req);
  const { data: { user } } = await sb.auth.getUser(token ?? undefined);
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const notPro = await requireTeacherPro(user.id);
  if (notPro) return notPro;

  const { data, error } = await readTeacherExportRows(sb, user.id);
  if (error) return NextResponse.json({ ok: false, error: 'Could not read class results' }, { status: 500 });
  return NextResponse.json({ ok: true, rows: data });
}
