/**
 * Accept-Encoding parsing, shared by the Express compression layer
 * (`server/middleware.ts`) and by routes that pre-compress their own body
 * (`app/api/dictionary-words/route.ts`).
 *
 * Both used to test the header with `.includes('gzip')` / `.includes('br')`,
 * which matches `brotli-ish`, `x-gzip`, and — worse — `br;q=0`, i.e. a client
 * that explicitly refused the encoding.
 */

/** True only if `name` appears as its own token with a non-zero q-value. */
export function acceptsEncoding(header: string | undefined | null, name: string): boolean {
  if (!header) return false;
  const wanted = name.toLowerCase();

  return header.split(',').some((part) => {
    const [token, ...params] = part.trim().split(';');
    if (token.trim().toLowerCase() !== wanted) return false;
    const q = params.map((p) => p.replace(/\s+/g, '').toLowerCase()).find((p) => p.startsWith('q='));
    return q ? parseFloat(q.slice(2)) > 0 : true;
  });
}

/**
 * Collapse the header to `br` when the client accepts brotli.
 *
 * Browsers send `gzip, deflate, br, zstd` with every encoding at q=1, and the
 * negotiation in front of us resolves that tie to gzip. Measured against
 * production on 2026-08-29: `Accept-Encoding: br` alone comes back
 * `content-encoding: br`, but `br;q=1.0, gzip;q=0.5` still comes back gzip —
 * the q-values are ignored, so the only reliable way to select brotli is to
 * leave nothing else on the table.
 */
export function normalizeAcceptEncoding(header: string | undefined): string | undefined {
  if (!header) return header;
  return acceptsEncoding(header, 'br') ? 'br' : header;
}
