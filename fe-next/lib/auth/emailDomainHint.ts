/**
 * Typo guard for school emails (t_9eb9ad5f).
 *
 * studnets.mpac.nsw.edu.au and student.mpac.nsw.edu.au both stranded a
 * student: the confirmation went to a domain that does not exist, and the
 * dead unconfirmed account can never join a class. Suggest only a domain
 * 1-2 edits away that we have already seen confirmed, and fall back to a
 * school-label typo when the entered domain has no MX (so a real
 * student.school.edu that receives mail is not rewritten to students.).
 */

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > 2) return 3;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain.includes('.') || /[\s/]/.test(domain)) return null;
  return domain;
}

export function applyDomain(email: string, domain: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  return `${email.slice(0, at)}@${domain}`;
}

/** Closest confirmed domain within 1-2 edits, or null. Ties break alphabetically. */
export function suggestConfirmedDomain(entered: string, known: readonly string[]): string | null {
  const domain = entered.trim().toLowerCase();
  if (!domain || domain.includes('@') || domain.length > 200) return null;
  let best: { domain: string; dist: number } | null = null;
  for (const raw of known) {
    const candidate = raw.trim().toLowerCase();
    if (!candidate || candidate === domain || candidate.includes('@')) continue;
    const dist = editDistance(domain, candidate);
    if (dist < 1 || dist > 2) continue;
    if (!best || dist < best.dist || (dist === best.dist && candidate < best.domain)) {
      best = { domain: candidate, dist };
    }
  }
  return best?.domain ?? null;
}

const SCHOOL_LABELS = ['students', 'student', 'school', 'schools'] as const;

/**
 * Rewrite one label that is 1-2 edits from a school mailbox word.
 * Used only when the entered domain has no MX — a live student.school
 * domain must not be rewritten just because students. is a dictionary word.
 */
export function suggestLabelTypo(domain: string): string | null {
  const labels = domain.trim().toLowerCase().split('.');
  if (labels.length < 2) return null;
  let changed = false;
  const next = labels.map((label) => {
    if ((SCHOOL_LABELS as readonly string[]).includes(label)) return label;
    let best: { word: string; dist: number } | null = null;
    for (const word of SCHOOL_LABELS) {
      const dist = editDistance(label, word);
      if (dist < 1 || dist > 2) continue;
      if (!best || dist < best.dist) best = { word, dist };
    }
    if (!best) return label;
    changed = true;
    return best.word;
  });
  return changed ? next.join('.') : null;
}

export function looksLikeSchoolDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase();
  if (!d || d.includes('@') || !d.includes('.')) return false;
  if (d.endsWith('.edu') || d.includes('.edu.') || d.includes('.k12.') || d.endsWith('.k12')) return true;
  if (d.includes('.sch.') || d.endsWith('.ac.uk') || d.includes('.ac.') || d.endsWith('.edu.au')) return true;
  if (d.startsWith('schools.') || d.startsWith('school.') || d.startsWith('students.') || d.startsWith('student.')) return true;
  return d.split('.').some((label) => (SCHOOL_LABELS as readonly string[]).includes(label));
}

export interface EmailHint {
  suggestion: string | null;
  mx: boolean | null;
  school: boolean;
}

/** First submit with a warning holds; an explicit "send anyway" releases it. */
export function emailHintBlocksSubmit(hint: EmailHint | null, acknowledged: boolean): boolean {
  if (!hint || acknowledged) return false;
  return Boolean(hint.suggestion) || hint.mx === false;
}

/** Best-effort hint before signup. Tests skip the network so submit stays sync. */
export async function resolveEmailHint(email: string, current: EmailHint | null): Promise<EmailHint | null> {
  if (process.env.NODE_ENV === 'test') return current;
  if (current) return current;
  if (!emailDomain(email) || typeof fetch !== 'function') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    const res = await fetch('/api/auth/email-domain-hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json() as { suggestion?: unknown; mx?: unknown; school?: unknown };
    return {
      suggestion: typeof data.suggestion === 'string' ? data.suggestion : null,
      mx: typeof data.mx === 'boolean' ? data.mx : null,
      school: data.school === true,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
