/**
 * The class the teacher just made, handed from the create form to the "your class is ready" step in
 * memory. That step used to find the class only by re-reading the class list, so any stale read (the
 * Android app's cache-first WebView, a slow replica, a refetch that never fired) showed "Classroom not
 * found" a second after the class was made. Lives for the page session only, keyed by id.
 */
export interface CreatedClassroom {
  id: string;
  name: string;
  join_code: string;
}

const created = new Map<string, CreatedClassroom>();

export function rememberCreatedClassroom(row: { id?: string | null; name?: string | null; join_code?: string | null } | null | undefined): void {
  if (!row?.id || !row.join_code) return;
  created.set(row.id, { id: row.id, name: row.name ?? '', join_code: row.join_code });
}

export function createdClassroom(id: string | null | undefined): CreatedClassroom | null {
  return (id && created.get(id)) || null;
}

/** Test seam. */
export function forgetCreatedClassrooms(): void {
  created.clear();
}
