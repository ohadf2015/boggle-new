/**
 * Pull string-literal table and RPC references out of source.
 * Skips storage bucket reads and the supabase-js increment update sentinel,
 * which is an update-payload value rather than a PostgREST function call.
 */

const TABLE_RE = /\.from\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g;
const RPC_RE = /\.rpc\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g;

function preceding(source, index) {
  return source.slice(Math.max(0, index - 24), index);
}

export function extractRefs(source) {
  const tables = new Set();
  const rpcs = new Set();
  for (const match of source.matchAll(TABLE_RE)) {
    if (/storage\s*$/.test(preceding(source, match.index))) continue;
    tables.add(match[1]);
  }
  for (const match of source.matchAll(RPC_RE)) {
    if (match[1] === 'increment') continue;
    rpcs.add(match[1]);
  }
  return { tables, rpcs };
}
