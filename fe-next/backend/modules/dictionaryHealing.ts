/**
 * Dictionary auto-healing sweep.
 *
 * Prevention (the offensive filter in auto-promotion) stops NEW slurs/offensive
 * words from being promoted. This sweep heals the back-catalogue: it re-checks
 * already auto-promoted English/Spanish words against the same filter and DEMOTES
 * any that are flagged — authoritatively removing them from every place a word
 * can be considered valid:
 *   1. `word_scores` row deleted     → not re-loaded at next boot
 *   2. community cache Set evicted    → invalid this process immediately
 *   3. base in-memory Set evicted     → invalid this process immediately
 *   4. `bot_word_blacklist` upserted  → bots/solver won't surface it
 *   5. `invalid_word_submissions` marked rejected → won't be re-promoted
 *
 * Covers the languages the offensive filter supports (en/es/sv/he via en.wiktionary
 * {{lb|<lang>|...}} labels). Japanese offensive-filtering happens at verify time
 * (Jisho) and the filter can't re-check ja here — ja relies on the admin queue +
 * bot_word_blacklist.
 */

import logger from '../utils/logger';
import { getSupabase } from './supabaseServer';
import { isOffensiveWord } from '../services/wiktionaryOffensiveFilter';
import { removeFromCommunityCache } from './communityWordManager';
import { removeApprovedWord } from '../dictionary';
import { emitDictionaryRun } from './dictionaryPipelineTelemetry';
import type { Language } from '@/shared/types/game';

const DEFAULT_BATCH = 500;
const HEAL_LANGS = ['en', 'es', 'sv', 'he'] as const;

export interface DictionaryHealingResult {
  scanned: number;
  demoted: number;
  words: string[];
}

export async function runDictionaryHealing(
  opts: { batchSize?: number } = {}
): Promise<DictionaryHealingResult> {
  const batchSize = opts.batchSize ?? DEFAULT_BATCH;
  const result: DictionaryHealingResult = { scanned: 0, demoted: 0, words: [] };

  const supabase = getSupabase();
  if (!supabase) {
    logger.error('DICT_HEAL', 'Supabase client not available');
    return result;
  }

  const { data: candidates, error } = await supabase
    .from('invalid_word_submissions')
    .select('id, word, language')
    .not('auto_promoted_at', 'is', null)
    .in('language', HEAL_LANGS as unknown as string[])
    .is('rejected_at', null)
    .limit(batchSize);

  if (error) {
    logger.error('DICT_HEAL', `Candidate fetch failed: ${error.message}`);
    return result;
  }
  if (!candidates || candidates.length === 0) {
    logger.info('DICT_HEAL', 'No auto-promoted words to sweep');
    return result;
  }

  for (const row of candidates as Array<{ id: string; word: string; language: string }>) {
    result.scanned++;
    try {
      if (!(await isOffensiveWord(row.word, row.language))) continue;

      await demote(supabase, row.id, row.word, row.language);
      result.demoted++;
      result.words.push(row.word);
      logger.warn('DICT_HEAL', `Demoted offensive word: ${row.word} [${row.language}]`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('DICT_HEAL', `Healing failed for "${row.word}": ${msg}`);
    }
  }

  logger.info('DICT_HEAL', `Sweep complete: scanned ${result.scanned}, demoted ${result.demoted}`);
  await emitDictionaryRun('heal', { scanned: result.scanned, demoted: result.demoted });
  return result;
}

type Supa = NonNullable<ReturnType<typeof getSupabase>>;

async function demote(supabase: Supa, id: string, word: string, language: string): Promise<void> {
  // 1. canonical DB signal
  await supabase.from('word_scores').delete().eq('word', word).eq('language', language);
  // 2 + 3. evict from both in-memory Sets (immediate)
  removeFromCommunityCache(word, language);
  await removeApprovedWord(word, language as Language);
  // 4. blacklist (bots/solver)
  await supabase
    .from('bot_word_blacklist')
    .upsert({ word, language, reason: 'auto_heal:offensive' }, { onConflict: 'word,language' });
  // 5. mark the submission rejected so it is never re-promoted
  await supabase
    .from('invalid_word_submissions')
    .update({
      rejected_at: new Date().toISOString(),
      verification_status: 'rejected_type',
      verification_source: 'auto_heal',
    })
    .eq('id', id);
}
