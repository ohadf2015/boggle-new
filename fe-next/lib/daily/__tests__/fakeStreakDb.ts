import { vi } from 'vitest'

type Row = Record<string, unknown>
type DbError = { code?: string; message: string } | null

export interface FakeDbOptions {
  tables?: Record<string, Row[]>
  insertErrors?: Record<string, DbError>
  selectErrors?: Record<string, DbError>
  /** Number of compare-and-swap updates on player_engagement that lose the race. */
  casLosses?: number
  /** Unique keys per table: an insert or upsert that repeats one is a 23505 / skipped. */
  unique?: Record<string, string[]>
}

/**
 * In-memory stand-in for the service-role client: select/insert/update/delete
 * with eq/gt filters, enough for the streak server code.
 */
export function makeFakeDb(opts: FakeDbOptions = {}) {
  const tables: Record<string, Row[]> = {}
  for (const [name, rows] of Object.entries(opts.tables ?? {})) tables[name] = rows.map((r) => ({ ...r }))
  let casLosses = opts.casLosses ?? 0
  const calls: Array<{ table: string; op: string; value?: unknown; filters: Array<[string, unknown]> }> = []

  function from(table: string) {
    const filters: Array<[string, string, unknown]> = []
    let op: 'select' | 'update' | 'delete' = 'select'
    let patch: Row | null = null
    const match = (r: Row) =>
      filters.every(([kind, c, v]) => {
        if (kind === 'eq') return r[c] === v
        if (kind === 'neq') return r[c] !== v
        if (kind === 'in') return (v as unknown[]).includes(r[c])
        if (kind === 'gt') return Number(r[c]) > Number(v)
        if (kind === 'gte') return String(r[c]) >= String(v)
        return r[c] == null
      })
    const key = opts.unique?.[table]
    const clashes = (value: Row) => !!key && rows().some((r) => key.every((c) => r[c] === value[c]))
    const rows = () => (tables[table] ??= [])

    const run = () => {
      calls.push({ table, op, value: patch ?? undefined, filters: filters.map(([, c, v]) => [c, v]) })
      if (op === 'select') {
        const err = opts.selectErrors?.[table]
        if (err) return { data: null, error: err }
        return { data: rows().filter(match), error: null }
      }
      if (op === 'delete') {
        tables[table] = rows().filter((r) => !match(r))
        return { data: null, error: null }
      }
      if (table === 'player_engagement' && casLosses > 0) {
        casLosses -= 1
        return { data: [], error: null }
      }
      const hit = rows().filter(match)
      hit.forEach((r) => Object.assign(r, patch))
      return { data: hit, error: null }
    }

    const chain: Record<string, unknown> = {
      select: vi.fn(() => chain),
      eq: vi.fn((c: string, v: unknown) => { filters.push(['eq', c, v]); return chain }),
      gt: vi.fn((c: string, v: unknown) => { filters.push(['gt', c, v]); return chain }),
      gte: vi.fn((c: string, v: unknown) => { filters.push(['gte', c, v]); return chain }),
      neq: vi.fn((c: string, v: unknown) => { filters.push(['neq', c, v]); return chain }),
      in: vi.fn((c: string, v: unknown[]) => { filters.push(['in', c, v]); return chain }),
      is: vi.fn((c: string) => { filters.push(['is', c, null]); return chain }),
      limit: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        const res = run()
        return { data: Array.isArray(res.data) ? res.data[0] ?? null : null, error: res.error }
      }),
      update: vi.fn((p: Row) => { op = 'update'; patch = p; return chain }),
      delete: vi.fn(() => { op = 'delete'; return chain }),
      insert: vi.fn(async (value: Row) => {
        calls.push({ table, op: 'insert', value, filters: [] })
        const err = opts.insertErrors?.[table]
        if (err) return { error: err }
        if (clashes(value)) return { error: { code: '23505', message: 'duplicate key' } }
        rows().push({ ...value })
        return { error: null }
      }),
      upsert: vi.fn(async (values: Row[]) => {
        calls.push({ table, op: 'upsert', value: values, filters: [] })
        const err = opts.insertErrors?.[table]
        if (err) return { error: err }
        for (const v of values) if (!clashes(v)) rows().push({ ...v })
        return { error: null }
      }),
      then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(run()).then(ok, bad),
    }
    return chain
  }

  const rpc = vi.fn()
  return { db: { from: vi.fn(from), rpc }, tables, calls, rpc }
}
