/** In-memory stand-in for word_review_state + student_lesson_progress, offering only the PostgREST builder calls the word memory makes. */
type Row = Record<string, unknown>;
type Err = { message: string } | null;

export function memoryDb(seed: { reviews?: Row[]; progress?: Row[]; failRead?: string; failWrite?: string } = {}) {
  const tables: Record<string, Row[]> = { word_review_state: [...(seed.reviews ?? [])], student_lesson_progress: [...(seed.progress ?? [])] };
  const upserts: Array<{ table: string; rows: Row[]; onConflict?: string }> = [];
  const from = (table: string) => {
    if (!(table in tables)) throw new Error(`unexpected table ${table}`);
    const eqs: Array<[string, unknown]> = [];
    let head = false;
    const err = (): Err => (seed.failRead === table ? { message: 'read failed' } : null);
    const match = () => tables[table].filter((r) => eqs.every(([c, v]) => r[c] === v));
    const builder = {
      select(_cols: string, opts?: { count?: string; head?: boolean }) {
        head = !!opts?.head;
        return builder;
      },
      eq(col: string, v: unknown) {
        eqs.push([col, v]);
        return builder;
      },
      async maybeSingle() {
        return { data: err() ? null : (match()[0] ?? null), error: err() };
      },
      then(ok: (r: unknown) => unknown, fail?: (e: unknown) => unknown) {
        const rows = match();
        const r = err() ? { data: null, error: err(), count: null } : head ? { data: null, error: null, count: rows.length } : { data: rows, error: null, count: null };
        return Promise.resolve(r).then(ok, fail);
      },
      upsert(input: Row | Row[], opts?: { onConflict?: string }) {
        const rows = Array.isArray(input) ? input : [input];
        upserts.push({ table, rows, onConflict: opts?.onConflict });
        const keys = (opts?.onConflict ?? '').split(',');
        if (seed.failWrite !== table) {
          for (const row of rows) {
            const i = tables[table].findIndex((r) => keys.every((k) => r[k] === row[k]));
            if (i >= 0) tables[table][i] = { ...tables[table][i], ...row };
            else tables[table].push({ ...row });
          }
        }
        return Promise.resolve({ error: seed.failWrite === table ? { message: 'write failed' } : null });
      },
    };
    return builder;
  };
  return { db: { from } as never, tables, upserts };
}

