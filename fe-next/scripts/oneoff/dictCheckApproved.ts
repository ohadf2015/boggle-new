/**
 * One-shot: run the deterministic dictionary backstop over the ALREADY-approved
 * corpus (words judged LLM-only before isValidWord was added to the sweep). A word
 * not in the game dictionary is blocked as a non-word. Catches the אגרוף-class /
 * HAJART-class errors across the whole serving corpus, all languages.
 *   railway run npx tsx scripts/oneoff/dictCheckApproved.ts
 * null (dict not loaded for a lang) = skip, never block. Idempotent.
 */
import { createClient } from '@supabase/supabase-js';
import { ensureLanguageLoaded, isValidWord } from '@/backend/dictionary';
import type { Language } from '@/types';

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const langs = (process.env.DICT_LANGS || 'en,he,sv,es,ja,ru').split(',').map((s) => s.trim()).filter(Boolean);

  for (const lang of langs) {
    await ensureLanguageLoaded(lang as Language);
    const { data, error } = await supabase
      .from('daily_challenge_word_bank')
      .select('word')
      .eq('language', lang)
      .eq('status', 'active')
      .not('judged_at', 'is', null)
      .eq('validation_status', 'approved')
      .limit(20000);
    if (error) { console.error(`[dictCheck] ${lang}: ${error.message}`); continue; }

    const bad: string[] = [];
    for (const r of data ?? []) {
      const w = r.word as string;
      const valid = isValidWord(w, lang as Language); // boolean | null
      if (valid === false) bad.push(w); // null = dict gap → skip, don't block
    }

    if (bad.length === 0) { console.log(`[dictCheck] ${lang}: ${(data ?? []).length} approved, 0 non-words`); continue; }

    // Block the non-words (chunked to keep the IN list sane).
    let blocked = 0;
    for (let i = 0; i < bad.length; i += 200) {
      const chunk = bad.slice(i, i + 200);
      const { error: upErr } = await supabase
        .from('daily_challenge_word_bank')
        .update({ status: 'blocked', validation_status: 'rejected', blocked_at: new Date().toISOString(), blocked_reason: 'dict backstop: not in game dictionary' })
        .eq('language', lang)
        .in('word', chunk);
      if (upErr) console.error(`[dictCheck] ${lang} block chunk failed: ${upErr.message}`);
      else blocked += chunk.length;
    }
    console.log(`[dictCheck] ${lang}: ${(data ?? []).length} approved, BLOCKED ${blocked} non-words: ${bad.slice(0, 25).join(', ')}${bad.length > 25 ? ' …' : ''}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('[dictCheck] FAILED', e); process.exit(1); });
