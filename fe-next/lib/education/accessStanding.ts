export type HistoryRow = {
  id: string;
  status: string;
  trial_expires_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type Standing = 'new' | 'pending' | 'declined' | 'review';

const newestFirst = (a: HistoryRow, b: HistoryRow) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);

/** A decline stands unless an admin approved a request after it; auto-approvals never overrule one. */
export function accessStanding(history: HistoryRow[]): { standing: Standing; pending: HistoryRow | null } {
  const rows = [...history].sort(newestFirst);
  const declines = rows.filter((r) => r.status === 'declined');
  if (declines.length > 0) {
    const lastDecline = declines.map((r) => r.reviewed_at ?? r.created_at).sort()[declines.length - 1];
    const overruled = rows.some((r) => r.status === 'approved' && r.reviewed_by && (r.reviewed_at ?? '') > lastDecline);
    return { standing: overruled ? 'review' : 'declined', pending: null };
  }
  const latest = rows[0];
  if (!latest) return { standing: 'new', pending: null };
  if (latest.status === 'pending') return { standing: 'pending', pending: latest };
  return { standing: 'review', pending: null };
}
