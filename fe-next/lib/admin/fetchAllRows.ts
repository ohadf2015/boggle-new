export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/** Reads every row of a query, one PostgREST page at a time (the default cap is 1000). */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ data: T[]; error: string | null }> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const res = await page(from, from + PAGE_SIZE - 1);
    if (res.error) return { data: [], error: res.error.message };
    const rows = res.data ?? [];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) return { data: out, error: null };
  }
}
