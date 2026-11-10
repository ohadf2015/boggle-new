/**
 * The shared shape of an admin "finding": one plain-language observation with the ids
 * behind it. Education and the Overview both build lists of these; copy lives in the UI,
 * keyed by `id`.
 */

/** `early` = a leading indicator: not yet a problem in the numbers, but where one starts. */
export type FindingTone = 'problem' | 'early' | 'win' | 'fact';

export interface Finding {
  id: string;
  tone: FindingTone;
  params: Record<string, string | number>;
  drill?: { kind: 'teachers' | 'classes'; ids: string[] };
}

const ORDER: Record<FindingTone, number> = { problem: 0, early: 1, win: 2, fact: 3 };

export const sortFindings = (findings: Finding[]): Finding[] => [...findings].sort((a, b) => ORDER[a.tone] - ORDER[b.tone]);

/** Collects findings for a rule set; `done()` returns them problems-first. */
export function createFindings() {
  const out: Finding[] = [];
  const add = (id: string, tone: FindingTone, params: Finding['params'] = {}, drill?: Finding['drill']) => {
    out.push({ id, tone, params, drill });
  };
  /** A finding about a list of teachers or classes: skipped when the list is empty. */
  const addList = (id: string, tone: FindingTone, kind: 'teachers' | 'classes', ids: string[], extra: Finding['params'] = {}) => {
    if (ids.length > 0) add(id, tone, { count: ids.length, ...extra }, { kind, ids });
  };
  return { add, addList, done: () => sortFindings(out) };
}
