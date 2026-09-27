/**
 * Runtime wiring for the proactive dictionary-improvement layer.
 *
 * Supplies REAL dependencies (file IO, dictionary singleton, Supabase, the
 * existing language verifiers + offensive filter) to the pure orchestrators in
 * proactiveDiscovery.ts / metricsJob.ts. Everything here is best-effort and
 * fail-safe — a thrown error is logged and swallowed so a cron tick can never
 * crash the server. The actual decision logic lives in the unit-tested modules.
 */
import * as path from 'path';
import { promises as fs } from 'fs';

import { dictionary } from '../../dictionary';
import { getSupabase } from '../supabaseServer';
import { verifyWordOnWiktionaryEn } from '../../services/wiktionaryEnVerifier';
import { verifyWordOnWiktionaryEs } from '../../services/wiktionaryEsVerifier';
import { verifyWordOnWiktionary } from '../../services/wiktionaryVerifier';
import { verifyWordOnJisho } from '../../services/jishoVerifier';
import { verifyWordOnMilog } from '../../services/milogWordVerifier';
import { isOffensiveWord } from '../../services/wiktionaryOffensiveFilter';

import { runProactiveDiscovery, type DiscoveryDeps, type DiscoveryResult } from './proactiveDiscovery';
import { runDictionaryMetrics, type MetricsDeps, type MetricsResult } from './metricsJob';
import { selectAuditSample } from './audit';
import { DICTIONARY_LANGS, type Candidate, type LangCode } from './types';

const log = (msg: string) => console.log(`[dict-improve] ${msg}`);

// ── data files ──────────────────────────────────────────────────────────--
// Resolve backend/dictionary/<rel> across ts-runtime and dist, plus a cwd
// fallback, so a missing copy in dist degrades to "no candidates" not a crash.
function dataFileCandidates(rel: string): string[] {
  return [
    path.join(__dirname, '..', '..', 'dictionary', rel),
    path.join(process.cwd(), 'backend', 'dictionary', rel),
    path.join(process.cwd(), 'dictionary', rel),
  ];
}

async function readWordFile(rel: string): Promise<string[]> {
  for (const p of dataFileCandidates(rel)) {
    try {
      const txt = await fs.readFile(p, 'utf-8');
      return txt
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));
    } catch {
      /* try next */
    }
  }
  return [];
}

// ── dictionary membership / size ──────────────────────────────────────────
const SET_BY_LANG: Record<LangCode, () => Set<string> | undefined> = {
  en: () => (dictionary as { englishWords?: Set<string> }).englishWords,
  he: () => (dictionary as { hebrewWords?: Set<string> }).hebrewWords,
  sv: () => (dictionary as { swedishWords?: Set<string> }).swedishWords,
  ja: () => (dictionary as { japaneseWords?: Set<string> }).japaneseWords,
  es: () => (dictionary as { spanishWords?: Set<string> }).spanishWords,
};

function dictHas(word: string, lang: LangCode): boolean {
  return dictionary.isValidWord(word, lang as never) === true;
}

// ── verifier dispatch (deterministic authority per language) ───────────────
async function verifyHolds(lang: LangCode, word: string): Promise<boolean> {
  try {
    let verified = false;
    switch (lang) {
      case 'en': verified = (await verifyWordOnWiktionaryEn(word)).verified; break;
      case 'es': verified = (await verifyWordOnWiktionaryEs(word)).verified; break;
      case 'sv': verified = (await verifyWordOnWiktionary(word, 'sv')).verified; break;
      case 'ja': verified = (await verifyWordOnJisho(word)).verified; break;
      case 'he': verified = (await verifyWordOnMilog(word)).verified; break;
    }
    if (!verified) return false;
    // A word that became offensive does NOT hold up.
    const offensive = await isOffensiveWord(word, lang).catch(() => false);
    return !offensive;
  } catch {
    // Network/transient error: treat as "holds" so a flaky API never triggers a
    // false precision regression (removals stay conservative — spec §8).
    return true;
  }
}

// ── discovery deps ─────────────────────────────────────────────────────────
function makeDiscoveryDeps(): DiscoveryDeps {
  return {
    loadCandidateWords: (lang) => readWordFile(path.join('candidates', `${lang}.txt`)),

    filterNovel: async (lang, words) => {
      await dictionary.ensureLanguageLoaded(lang as never).catch(() => {});
      const notInDict = words.filter((w) => !dictHas(w, lang));
      if (notInDict.length === 0) return [];
      // Drop words already queued or already promoted (avoid duplicate rows).
      const seen = new Set<string>();
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('supabase unavailable');
        for (const table of ['invalid_word_submissions', 'word_scores'] as const) {
          const { data } = await supabase
            .from(table)
            .select('word')
            .eq('language', lang)
            .in('word', notInDict);
          for (const row of data ?? []) seen.add((row as { word: string }).word);
        }
      } catch (e) {
        log(`filterNovel: supabase lookup failed (${String(e)}) — proceeding with dict-only novelty`);
      }
      return notInDict.filter((w) => !seen.has(w));
    },

    enqueue: async (lang, cands: Candidate[]) => {
      if (cands.length === 0) return 0;
      try {
        const nowIso = new Date().toISOString();
        // Column values are dictated by the live get_verification_queue predicate
        // (verified against the DB 2026-06-04): it selects
        //   verification_status IN ('pending','error') AND submission_count >= 2
        //   AND verification_attempts < 3  (a NULL on either column FAILS the filter).
        // Hebrew is excluded from that queue (language != 'he') — its rows are
        // consumed by the milog enrichment path via milog_status='pending'.
        const rows = cands.map((c) => ({
          word: c.word,
          language: lang,
          submission_count: 2,
          verification_status: 'pending',
          verification_attempts: 0,
          verification_source: 'proactive',
          reason: 'not_in_dictionary',
          first_submitted_at: nowIso,
          last_submitted_at: nowIso,
          ...(lang === 'he' ? { milog_status: 'pending', milog_attempts: 0 } : {}),
        }));
        const supabase = getSupabase();
        if (!supabase) throw new Error('supabase unavailable');
        const { data, error } = await supabase
          .from('invalid_word_submissions')
          .upsert(rows, { onConflict: 'word,language', ignoreDuplicates: true })
          .select('word');
        if (error) {
          log(`enqueue ${lang}: ${error.message}`);
          return 0;
        }
        return data?.length ?? 0;
      } catch (e) {
        log(`enqueue ${lang} failed: ${String(e)}`);
        return 0;
      }
    },

    log,
  };
}

// ── metrics deps ───────────────────────────────────────────────────────────
function langSeed(lang: LangCode): number {
  let s = 0;
  for (let i = 0; i < lang.length; i += 1) s = (s * 31 + lang.charCodeAt(i)) >>> 0;
  return s;
}

function makeMetricsDeps(boundLang: LangCode): MetricsDeps {
  return {
    loadGoldValid: (lang) => readWordFile(path.join('gold', `gold_valid_${lang}.txt`)),
    loadGoldInvalid: (lang) => readWordFile(path.join('gold', `gold_invalid_${lang}.txt`)),

    // Bound to the language at construction — membership is meaningless without it.
    has: (w) => dictHas(w, boundLang),

    sampleAcceptedWords: async (lang, n) => {
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('supabase unavailable');
        const { data } = await supabase
          .from('word_scores')
          .select('word')
          .eq('language', lang)
          .eq('is_potentially_valid', true)
          .limit(2000);
        const words = (data ?? []).map((r) => (r as { word: string }).word);
        return selectAuditSample(words, { n, seed: langSeed(lang), stratifyByLength: true });
      } catch (e) {
        log(`sampleAcceptedWords ${lang} failed: ${String(e)}`);
        return [];
      }
    },

    reverify: (lang, word) => verifyHolds(lang, word),

    dictSize: async (lang) => {
      await dictionary.ensureLanguageLoaded(lang as never).catch(() => {});
      return SET_BY_LANG[lang]()?.size ?? 0;
    },

    loadPrevPrecision: async (lang) => {
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('supabase unavailable');
        const { data } = await supabase
          .from('dictionary_quality_metrics')
          .select('precision_sample')
          .eq('language', lang)
          .order('measured_at', { ascending: false })
          .limit(1);
        const v = data?.[0] as { precision_sample: number | null } | undefined;
        return v?.precision_sample ?? null;
      } catch {
        return null;
      }
    },

    save: async (row) => {
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('supabase unavailable');
        await supabase.from('dictionary_quality_metrics').insert(row);
      } catch (e) {
        log(`metrics save failed: ${String(e)}`);
      }
    },

    log,
  };
}

// ── public entry points (called by cron + nightly lane) ────────────────────

/** Day-rotated weakest-first target language so each daily tick advances one. */
export function rotateTargetLang(date = new Date()): LangCode {
  const dayOfYear = Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000);
  // weakest coverage first so they get the most frequent attention
  const order: LangCode[] = ['ja', 'sv', 'es', 'en', 'he'];
  return order[dayOfYear % order.length];
}

export async function runProactiveDiscoveryForLang(
  lang: LangCode,
  limit = 200,
): Promise<DiscoveryResult> {
  return runProactiveDiscovery(lang, { limit, deps: makeDiscoveryDeps() });
}

export async function runDictionaryMetricsForLang(
  lang: LangCode,
  sampleN = 100,
): Promise<MetricsResult> {
  // Membership needs the language resident before metrics are computed.
  await dictionary.ensureLanguageLoaded(lang as never).catch(() => {});
  return runDictionaryMetrics(lang, { sampleN, deps: makeMetricsDeps(lang) });
}

/** Run discovery for the day's rotated language; metrics for ALL languages. */
export async function runDailyDictionaryImprovement(): Promise<void> {
  const target = rotateTargetLang();
  log(`daily run — discovery target=${target}`);
  try {
    const d = await runProactiveDiscoveryForLang(target, 200);
    log(`discovery ${target}: considered=${d.considered} novel=${d.novel} queued=${d.queued}`);
  } catch (e) {
    log(`discovery ${target} failed: ${String(e)}`);
  }
  for (const lang of DICTIONARY_LANGS) {
    try {
      const m = await runDictionaryMetricsForLang(lang, 100);
      log(`metrics ${lang}: recall=${m.recall.toFixed(3)} precision=${m.precision.toFixed(3)} gate=${m.gate.ok ? 'ok' : 'FAIL'}`);
    } catch (e) {
      log(`metrics ${lang} failed: ${String(e)}`);
    }
  }
}
