import type { PublicNameIssue } from './publicName';

const ISSUES = new Set<PublicNameIssue>(['empty', 'placeholder', 'default', 'profane']);

/** Ask the server whether a name can show on public boards. A failed check never blocks: the boards guard server-side. */
export async function checkPublicName(name: string): Promise<PublicNameIssue | null> {
  try {
    const res = await fetch('/api/names/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok?: boolean; reason?: PublicNameIssue };
    return body.ok === false && body.reason && ISSUES.has(body.reason) ? body.reason : null;
  } catch {
    return null;
  }
}
