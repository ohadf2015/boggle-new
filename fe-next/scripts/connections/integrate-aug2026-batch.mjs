// Integrate the 2026-08 native-judged generation batch + quality sweep.
//
//   node scripts/connections/integrate-aug2026-batch.mjs --dir <scratchpad> [--apply] <locale...>
//
// Reads per-locale files written by the generation agents:
//   gen-<locale>.json    {"regular":[...], "pyramids":[...]}
//   sweep-<locale>.json  {"flags":[{id,reason,severity}], "add_accepted":[{id,additions}], "too_obvious":[{id,...}]}
// Optional overrides (agent follow-ups): gen-<locale>-final/-fixed/-rigorous/-conservative.json
// and an exclusion list rejects-<locale>.json (ids vetoed by the cross-judge).
//
// Default is DRY RUN (prints what it would do). Pass --apply to write.
// Sweep culls set is_active=false (never delete). too_obvious only retiers
// difficulty DOWN — per owner feedback easy-but-familiar puzzles are a feature.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local', override: true });

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const dirIdx = args.indexOf('--dir');
const dir = dirIdx >= 0 ? args[dirIdx + 1] : null;
const locales = args.filter((a, i) => !a.startsWith('--') && i !== dirIdx + 1);
if (!dir || locales.length === 0) {
  console.error('usage: integrate-aug2026-batch.mjs --dir <dir> [--apply] <locale...>');
  process.exit(1);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const clean = (s) => String(s ?? '').trim();
const DIFFS = ['easy', 'medium', 'hard'];

// Prefer the agent's follow-up refinement file when present.
function loadGen(locale) {
  for (const suffix of ['-final2', '-final', '-rigorous', '-fixed', '-conservative', '']) {
    const p = join(dir, `gen-${locale}${suffix}.json`);
    if (existsSync(p)) return { data: JSON.parse(readFileSync(p, 'utf8')), file: p };
  }
  return { data: null, file: null };
}

// Pyramid correction rounds land in a dedicated -pyr2 file; it supersedes the
// (mostly degenerate) first-round pyramids. Keys may arrive camelCase.
function normPyramid(p) {
  return {
    ...p,
    meta_answer: p.meta_answer ?? p.metaAnswer,
    meta_accepted: p.meta_accepted ?? p.metaAccepted ?? [],
    meta_hint: p.meta_hint ?? p.metaHint ?? null,
    base: (p.base ?? []).map((b) => ({ ...b, accepted: b.accepted ?? b.acceptedAnswers ?? [] })),
  };
}

function loadPyramids(locale, gen) {
  // Union of all sources, best-first: constrained round 3 > round 2 > round 1,
  // plus the deterministic pool-mined set. The structural filter + meta dedupe
  // downstream drop degenerates and duplicates, so a bad source costs nothing.
  const sources = [
    loadJson(join(dir, `gen-${locale}-pyr3.json`))?.pyramids,
    loadJson(new URL(`./mine/out/pyramids-${locale}.json`, import.meta.url).pathname)?.pyramids,
    loadJson(join(dir, `gen-${locale}-pyr2.json`))?.pyramids,
    gen?.pyramids,
  ];
  const list = sources.flatMap((s) => s ?? []);
  return { list: list.map(normPyramid), fromPyr2: sources[0] != null || sources[2] != null };
}

function loadJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

for (const locale of locales) {
  const { data: gen, file: genFile } = loadGen(locale);
  // Sweep may also have a refined variant.
  const sweep =
    loadJson(join(dir, `sweep-${locale}-rigorous.json`)) ??
    loadJson(join(dir, `sweep-${locale}-fixed.json`)) ??
    loadJson(join(dir, `sweep-${locale}.json`));
  // Verifiers write a flat id array, {"rejects":[{id,reason}]}, or {"rejected_ids":[...]}.
  const rejectIds = (raw) => {
    const list = Array.isArray(raw) ? raw : raw?.rejects ?? raw?.rejected_ids ?? [];
    return list.map((x) => (typeof x === 'string' ? x : x?.id)).filter(Boolean);
  };
  const rejects = new Set([
    ...rejectIds(loadJson(join(dir, `rejects-${locale}.json`))),
    ...rejectIds(loadJson(join(dir, `rejects-${locale}-pyr.json`))),
  ].map(String));

  console.log(`\n=== ${locale} (gen: ${genFile ?? 'NONE'}) ===`);

  const { data: existing, error: exErr } = await sb
    .from('connections_puzzles')
    .select('id,word1,bridge,word2,accepted_answers,difficulty,is_active')
    .eq('locale', locale);
  if (exErr) throw exErr;
  const byId = new Map(existing.map((p) => [p.id, p]));
  const have = new Set(existing.map((p) => `${p.word1}|${p.bridge}|${p.word2}`.toLowerCase()));

  const { data: existingPyr, error: pyErr } = await sb
    .from('connections_pyramid_puzzles')
    .select('id,meta_answer')
    .eq('locale', locale);
  if (pyErr) throw pyErr;
  const havePyrIds = new Set(existingPyr.map((p) => p.id));
  // Batch-internal meta dedupe only — duplicate meta_answers vs the existing
  // pool are allowed (DB precedent), the interleaver keeps them apart.
  const havePyrMeta = new Set();

  // ── 1. Sweep: deactivate culls ────────────────────────────────────────
  // Culls motivated by corrupt accepted_answers are handled by wiping the
  // field, not deactivating the (usually fine) puzzle. Verifier unculls win.
  const unculled = new Set(rejectIds(loadJson(join(dir, `uncull-${locale}.json`))));
  const cullIds = (sweep?.flags ?? [])
    .filter((f) => f.severity === 'cull' && byId.get(f.id)?.is_active)
    .filter((f) => !/accept/i.test(f.reason ?? ''))
    .filter((f) => !unculled.has(f.id))
    .map((f) => f.id);
  console.log(`sweep culls: ${cullIds.length}`, cullIds.join(', '));
  if (apply && cullIds.length) {
    const { error } = await sb.from('connections_puzzles').update({ is_active: false }).in('id', cullIds);
    if (error) throw error;
  }

  // ── 2. Sweep: merge accepted-answer additions ─────────────────────────
  let accMerged = 0;
  for (const a of sweep?.add_accepted ?? []) {
    const row = byId.get(a.id);
    const additions = (a.additions ?? []).map(clean).filter(Boolean);
    if (!row || additions.length === 0) continue;
    // An "addition" equal to the bridge itself is judge noise, skip it.
    const merged = [...new Set([...(row.accepted_answers ?? []), ...additions])]
      .filter((x) => x.toLowerCase() !== clean(row.bridge).toLowerCase());
    if (merged.length === (row.accepted_answers ?? []).length) continue;
    accMerged++;
    if (apply) {
      const { error } = await sb.from('connections_puzzles').update({ accepted_answers: merged }).eq('id', a.id);
      if (error) throw error;
    }
  }
  console.log(`accepted_answers merged: ${accMerged}`);

  // ── 3. Sweep: retier too-obvious DOWN only (never deactivate) ─────────
  let retiered = 0;
  for (const o of sweep?.too_obvious ?? []) {
    const row = byId.get(o.id);
    const target = o.suggested_difficulty ?? o.suggest_retier;
    if (!row || !DIFFS.includes(target)) continue; // "trivial" → keep easy, no-op
    if (DIFFS.indexOf(target) >= DIFFS.indexOf(row.difficulty)) continue; // down only
    retiered++;
    if (apply) {
      const { error } = await sb.from('connections_puzzles').update({ difficulty: target }).eq('id', o.id);
      if (error) throw error;
    }
  }
  console.log(`retiered down: ${retiered}`);

  // ── 4. Insert new regular puzzles ─────────────────────────────────────
  const rows = [];
  for (const c of gen?.regular ?? []) {
    const w1 = clean(c.word1), b = clean(c.bridge), w2 = clean(c.word2);
    const id = clean(c.id);
    if (!id || !w1 || !b || !w2) continue;
    if (rejects.has(id)) continue;
    if (w1 === w2 || w1 === b || w2 === b) continue;
    if (byId.has(id)) continue;
    const key = `${w1}|${b}|${w2}`.toLowerCase();
    if (have.has(key)) continue;
    have.add(key);
    const ex = c.examples?.[0];
    rows.push({
      id, locale,
      word1: w1, bridge: b, word2: w2,
      accepted_answers: [...new Set((c.accepted_answers ?? []).map(clean).filter(Boolean))],
      hint: c.hint ? clean(c.hint) : null,
      examples: ex ? [{ w1: clean(ex.w1), bridge: b, w2: clean(ex.w2) }] : [],
      difficulty: DIFFS.includes(c.difficulty) ? c.difficulty : 'medium',
      source: 'generated',
      is_active: true,
      quality_score: Math.max(60, Math.min(100, Number(c.quality_score) || 75)),
    });
  }
  console.log(`regular to insert: ${rows.length}/${gen?.regular?.length ?? 0}`);
  if (apply && rows.length) {
    const { error } = await sb.from('connections_puzzles').insert(rows);
    if (error) throw error;
  }

  // ── 5. Insert pyramids ────────────────────────────────────────────────
  const { list: pyrList, fromPyr2 } = loadPyramids(locale, gen);
  const pyrRows = [];
  for (const p of pyrList) {
    const id = clean(p.id);
    const meta = clean(p.meta_answer);
    if (!id || !meta || rejects.has(id)) continue;
    if (havePyrIds.has(id) || havePyrMeta.has(meta.toLowerCase())) continue;
    const base = (p.base ?? []).map((b2) => ({
      id: clean(b2.id),
      word1: clean(b2.word1), word2: clean(b2.word2), bridge: clean(b2.bridge),
      hint: b2.hint ? clean(b2.hint) : null,
      accepted: (b2.accepted ?? []).map(clean).filter(Boolean),
      difficulty: DIFFS.includes(b2.difficulty) ? b2.difficulty : 'medium',
    }));
    const bridges = base.map((b2) => b2.bridge.toLowerCase());
    // Format law: 3 base puzzles, bridges pairwise distinct and ≠ meta.
    if (base.length !== 3) continue;
    if (new Set(bridges).size !== 3) continue;
    if (bridges.includes(meta.toLowerCase())) continue;
    if (base.some((b2) => !b2.word1 || !b2.word2 || !b2.bridge)) continue;
    havePyrMeta.add(meta.toLowerCase());
    pyrRows.push({
      id, locale,
      meta_answer: meta,
      meta_accepted: [...new Set((p.meta_accepted ?? []).map(clean).filter(Boolean))],
      meta_hint: p.meta_hint ? clean(p.meta_hint) : null,
      base,
      difficulty: DIFFS.includes(p.difficulty) ? p.difficulty : 'medium',
      source: 'generated',
      is_active: true,
      quality_score: Math.max(60, Math.min(100, Number(p.quality_score) || 75)),
    });
  }
  console.log(`pyramids to insert: ${pyrRows.length}/${pyrList.length}${fromPyr2 ? ' (pyr2)' : ''}`);
  if (apply && pyrRows.length) {
    const { error } = await sb.from('connections_pyramid_puzzles').insert(pyrRows);
    if (error) throw error;
  }
}

console.log(`\n${apply ? 'APPLIED' : 'DRY RUN — re-run with --apply to write'}`);
