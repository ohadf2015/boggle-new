'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThumbsUp, ThumbsDown, HelpCircle, Save, Flag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPuzzlesForLocale } from '@/lib/connections/puzzles';
import { buildReviewRows, filterRows, type ReviewFilter } from '@/lib/connections/reviewUi';
import { fetchReviews, saveReviews, type FeedbackStat, type SaveVerdict } from '@/lib/connections/reviewClient';
import type { Verdict } from '@/lib/connections/review';

const VERDICT_BTN: Record<Verdict, { Icon: typeof ThumbsUp; on: string }> = {
  good: { Icon: ThumbsUp, on: 'border-neo-lime bg-neo-lime/20 text-neo-lime' },
  bad: { Icon: ThumbsDown, on: 'border-neo-red bg-neo-red/20 text-neo-red' },
  unsure: { Icon: HelpCircle, on: 'border-neo-yellow bg-neo-yellow/20 text-neo-yellow' },
};

export default function ConnectionsReviewPanel() {
  const rows = useMemo(
    () =>
      buildReviewRows({
        en: getPuzzlesForLocale('en'),
        he: getPuzzlesForLocale('he'),
        es: getPuzzlesForLocale('es'),
        sv: getPuzzlesForLocale('sv'),
        ja: getPuzzlesForLocale('ja'),
      }),
    [],
  );
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [feedback, setFeedback] = useState<Record<string, FeedbackStat>>({});
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<ReviewFilter>({ language: 'all', difficulty: 'all', source: 'all', status: 'all' });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetchReviews().then(({ reviews, feedback: fb }) => {
      if (cancelled) return;
      setVerdicts(Object.fromEntries(reviews.map((r) => [r.puzzle_id, r.verdict])));
      setFeedback(Object.fromEntries(fb.map((f) => [f.puzzle_id, f])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => filterRows(rows, filter, verdicts), [rows, filter, verdicts]);

  const mark = useCallback((id: string, v: Verdict) => {
    setVerdicts((prev) => ({ ...prev, [id]: v }));
    setChanged((prev) => new Set(prev).add(id));
  }, []);

  const bulkMark = useCallback(
    (v: Verdict) => {
      if (selected.size === 0) return;
      setVerdicts((prev) => {
        const next = { ...prev };
        for (const id of selected) next[id] = v;
        return next;
      });
      setChanged((prev) => {
        const next = new Set(prev);
        for (const id of selected) next.add(id);
        return next;
      });
      setSelected(new Set());
    },
    [selected],
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected((prev) => (prev.size === visible.length ? new Set() : new Set(visible.map((r) => r.id))));
  }, [visible]);

  const save = useCallback(async () => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    const batch: SaveVerdict[] = [...changed]
      .map((id) => {
        const row = byId.get(id);
        const v = verdicts[id];
        if (!row || !v) return null;
        return { puzzleId: id, language: row.language, word1: row.word1, word2: row.word2, bridge: row.bridge, verdict: v };
      })
      .filter((x): x is SaveVerdict => x !== null);
    if (batch.length === 0) return;
    setSaving(true);
    const res = await saveReviews(batch);
    setSaving(false);
    if (res.ok) {
      setChanged(new Set());
      setSavedMsg(`Saved ${res.saved} verdicts`);
    } else {
      setSavedMsg(`Save failed: ${res.error ?? 'error'}`);
    }
  }, [changed, verdicts, rows]);

  const counts = useMemo(() => {
    const c = { good: 0, bad: 0, unsure: 0, reviewed: 0 };
    for (const v of Object.values(verdicts)) {
      if (v in c) (c as Record<string, number>)[v]++;
      c.reviewed++;
    }
    return c;
  }, [verdicts]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 text-neo-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-neo-display text-2xl font-black">Connection Puzzle Review</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neo-white/70">{rows.length} puzzles</span>
          <span className="text-neo-lime">👍 {counts.good}</span>
          <span className="text-neo-red">👎 {counts.bad}</span>
          <span className="text-neo-yellow">🤔 {counts.unsure}</span>
          <span className="text-neo-white/50">{rows.length - counts.reviewed} unreviewed</span>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2" data-testid="review-filters">
        <Select value={filter.language} onValueChange={(v) => setFilter((f) => ({ ...f, language: v as ReviewFilter['language'] }))}>
          <SelectTrigger aria-label="language" className="h-8 w-auto px-2 py-1 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All langs</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="he">Hebrew</SelectItem><SelectItem value="es">Spanish</SelectItem><SelectItem value="sv">Swedish</SelectItem><SelectItem value="ja">Japanese</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter.difficulty} onValueChange={(v) => setFilter((f) => ({ ...f, difficulty: v as ReviewFilter['difficulty'] }))}>
          <SelectTrigger aria-label="difficulty" className="h-8 w-auto px-2 py-1 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All diff</SelectItem><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter.source} onValueChange={(v) => setFilter((f) => ({ ...f, source: v as ReviewFilter['source'] }))}>
          <SelectTrigger aria-label="source" className="h-8 w-auto px-2 py-1 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem><SelectItem value="curated">Curated</SelectItem><SelectItem value="generated">Generated</SelectItem><SelectItem value="online">Online</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter.status} onValueChange={(v) => setFilter((f) => ({ ...f, status: v as ReviewFilter['status'] }))}>
          <SelectTrigger aria-label="status" className="h-8 w-auto px-2 py-1 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem><SelectItem value="unreviewed">Unreviewed</SelectItem><SelectItem value="good">Good</SelectItem><SelectItem value="bad">Bad</SelectItem><SelectItem value="unsure">Unsure</SelectItem>
          </SelectContent>
        </Select>
        <button type="button" onClick={selectAllVisible} className="rounded-neo border-neo border-neo-cyan/60 px-3 py-1 text-sm text-neo-cyan">
          {selected.size === visible.length && visible.length > 0 ? 'Deselect all' : `Select all (${visible.length})`}
        </button>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div data-testid="bulk-bar" className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-neo border-neo-thick border-neo-pink bg-neo-navy-light p-2 shadow-hard">
          <span className="text-sm font-bold">{selected.size} selected</span>
          <button type="button" data-testid="bulk-good" onClick={() => bulkMark('good')} className="rounded-neo border-2 border-neo-lime px-3 py-1 text-sm text-neo-lime">Mark good</button>
          <button type="button" data-testid="bulk-bad" onClick={() => bulkMark('bad')} className="rounded-neo border-2 border-neo-red px-3 py-1 text-sm text-neo-red">Mark bad</button>
          <button type="button" data-testid="bulk-unsure" onClick={() => bulkMark('unsure')} className="rounded-neo border-2 border-neo-yellow px-3 py-1 text-sm text-neo-yellow">Mark unsure</button>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button type="button" data-testid="save-btn" onClick={save} disabled={saving || changed.size === 0} className="inline-flex items-center gap-2 rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan px-4 py-2 font-neo-display font-black text-neo-navy shadow-hard disabled:opacity-40">
          <Save className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> Save {changed.size > 0 ? `(${changed.size})` : ''}
        </button>
        {savedMsg && <span className="text-sm text-neo-lime">{savedMsg}</span>}
      </div>

      {/* Rows */}
      <ol className="flex flex-col gap-1.5">
        {visible.map((r) => {
          const v = verdicts[r.id];
          const fb = feedback[r.id];
          const isHe = r.language === 'he';
          return (
            <li key={r.id} data-testid={`row-${r.id}`} className="flex items-center gap-2 rounded-neo border-neo border-neo-white/10 bg-neo-navy px-2 py-1.5">
              <input type="checkbox" aria-label={`select ${r.id}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4" />
              <div className="min-w-0 flex-1" dir={isHe ? 'rtl' : 'ltr'}>
                <span className="font-neo-display font-bold">
                  {r.word1} <span className="text-neo-cyan">→ {r.bridge} →</span> {r.word2}
                </span>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-neo-white/40" dir="ltr">
                  <span>{r.id}</span><span>{r.difficulty}</span><span>{r.source}</span>
                  {fb && (fb.dislikes > 0 || fb.gaveups > 0) && (
                    <span data-testid={`fb-${r.id}`} className="text-neo-red/80">
                      <Flag className="inline h-3 w-3" aria-hidden="true" /> {fb.dislikes}👎 {fb.gaveups}🏳️ /{fb.total}
                    </span>
                  )}
                </div>
              </div>
              {(['good', 'bad', 'unsure'] as Verdict[]).map((vd) => {
                const { Icon, on } = VERDICT_BTN[vd];
                return (
                  <button key={vd} type="button" data-testid={`${vd}-${r.id}`} aria-label={`${vd} ${r.id}`} onClick={() => mark(r.id, vd)}
                    className={['grid h-7 w-7 place-items-center rounded-neo border-2', v === vd ? on : 'border-neo-white/15 text-neo-white/40'].join(' ')}>
                    <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                  </button>
                );
              })}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
