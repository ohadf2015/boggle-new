/**
 * Writes lib/seo/wordLists/wordLists.generated.json — the only input of the public
 * /education/lists pages. Read-only against Supabase.
 *
 *   node_modules/.bin/tsx scripts/seo/snapshot-word-lists.ts
 *
 * Sources: active curriculum_word_lists, plus public teacher lists whose author is a
 * non-test teacher and that no report has flagged. Lists under 10 real words are
 * kept here and dropped by the page model, so the rule lives in one tested place.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(__dirname, '..', '..');
config({ path: path.join(ROOT, '.env.local') });

const OUT = path.join(ROOT, 'lib', 'seo', 'wordLists', 'wordLists.generated.json');

type Word = { word?: string; definition?: string };
type Row = { id: string; name: string; description: string | null; language: string; words: Word[] };

const compactWords = (words: Word[] | null) =>
  (words ?? []).map((w) => ({ w: String(w?.word ?? ''), d: String(w?.definition ?? '') }));

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('snapshot-word-lists: Supabase URL/key missing from .env.local');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const curriculum = await db
    .from('curriculum_word_lists')
    .select('id, name, description, language, grade_level, subject, words')
    .eq('is_active', true)
    .order('id');
  if (curriculum.error) throw new Error(`curriculum: ${curriculum.error.message}`);
  if (!curriculum.data?.length) throw new Error('curriculum: zero active lists — refusing to write an empty snapshot');

  let teacher: Array<Row & { author_name: string | null; grade_band: string | null; topic: string | null }> = [];
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const tests = await db.from('profiles').select('id').eq('is_test_account', true);
    const flagged = await db.rpc('flagged_vocabulary_lesson_ids');
    if (tests.error || flagged.error) {
      console.warn('teacher lists skipped:', tests.error?.message ?? flagged.error?.message);
    } else {
      const testIds = new Set((tests.data ?? []).map((r: { id: string }) => r.id));
      const flaggedIds = new Set(
        (Array.isArray(flagged.data) ? flagged.data : []).map((v: unknown) =>
          String(typeof v === 'object' && v ? Object.values(v)[0] : v),
        ),
      );
      const pub = await db
        .from('vocabulary_lessons')
        .select('id, teacher_id, name, description, language, words, author_name, grade_band, topic')
        .eq('is_public', true)
        .order('id');
      if (pub.error) console.warn('teacher lists skipped:', pub.error.message);
      teacher = (pub.data ?? []).filter(
        (r: { id: string; teacher_id: string }) => !testIds.has(r.teacher_id) && !flaggedIds.has(r.id),
      );
    }
  } else {
    console.warn('teacher lists skipped: no service-role key (test-account filter needs it)');
  }

  const lists = [
    ...curriculum.data.map((r) => ({
      id: r.id,
      origin: 'curriculum' as const,
      name: r.name,
      description: r.description ?? '',
      language: r.language,
      grade: Number(String(r.grade_level ?? '').replace('grade_', '')) || null,
      subject: r.subject ?? 'general',
      words: compactWords(r.words),
    })),
    ...teacher.map((r) => ({
      id: r.id,
      origin: 'teacher' as const,
      name: r.name,
      description: r.description ?? '',
      language: r.language,
      grade: Number(String(r.grade_band ?? '').match(/\d+/)?.[0]) || null,
      subject: r.topic ?? 'general',
      author: r.author_name ?? undefined,
      words: compactWords(r.words),
    })),
  ];

  const snapshot = { generatedAt: new Date().toISOString().slice(0, 10), lists };
  fs.writeFileSync(OUT, `${JSON.stringify(snapshot, null, 1)}\n`);
  console.log(`wrote ${lists.length} lists (${teacher.length} teacher) to ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
