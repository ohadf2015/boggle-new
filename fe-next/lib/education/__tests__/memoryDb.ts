/** In-memory stand-in for word_review_state + student_lesson_progress, offering only the PostgREST builder calls the word memory makes. */
type Row = Record<string, unknown>;
type Err = { message: string } | null;

export function memoryDb(
  seed: { reviews?: Row[]; progress?: Row[]; failRead?: string; failWrite?: string; beforeRpc?: (tables: Record<string, Row[]>) => void } = {},
) {
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
  const rpcs: Array<{ name: string; args: Row }> = [];
  /** Mirrors apply_words_mastered: one statement, existing order kept, removes by exact text, adds deduped case-insensitively. */
  const rpc = async (name: string, args: Row) => {
    if (name !== 'apply_words_mastered') throw new Error(`unexpected rpc ${name}`);
    rpcs.push({ name, args });
    seed.beforeRpc?.(tables);
    if (seed.failWrite === 'apply_words_mastered') return { data: null, error: { message: 'write failed' } };
    const rows = tables.student_lesson_progress;
    let row = rows.find((r) => r.student_id === args.p_student_id && r.lesson_id === args.p_lesson_id);
    if (!row) rows.push((row = { student_id: args.p_student_id, lesson_id: args.p_lesson_id, words_mastered: [] }));
    const remove = new Set(args.p_remove as string[]);
    const out: string[] = [];
    const seen = new Set<string>();
    for (const w of [...((row.words_mastered as string[]) ?? []), ...(args.p_add as string[])]) {
      const k = w.trim().toLowerCase();
      if (!k || remove.has(w) || seen.has(k)) continue;
      seen.add(k);
      out.push(w);
    }
    row.words_mastered = out;
    return { data: out, error: null };
  };
  return { db: { from, rpc } as never, tables, upserts, rpcs };
}

