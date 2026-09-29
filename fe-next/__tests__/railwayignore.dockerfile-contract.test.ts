import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Repo root is one level above fe-next (railway.json sets dockerfilePath: fe-next/Dockerfile).
const root = resolve(__dirname, '..', '..');
const dockerfile = readFileSync(resolve(root, 'fe-next/Dockerfile'), 'utf8');
const ignoreLines = readFileSync(resolve(root, '.railwayignore'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#') && !l.startsWith('!'));

// Paths the runner stage copies out of the builder (/app/<path>) -> repo path under fe-next/.
const builderCopies = [...dockerfile.matchAll(/COPY --from=builder\s+(?:--chown=\S+\s+)?(.+?)\s+\S+\s*$/gm)]
  .flatMap((m) => m[1].split(/\s+/))
  .map((p) => p.replace(/^\/app\//, ''));

// Minimal gitignore-style matcher: exact, dir prefix, or glob with * only.
function ignored(repoPath: string): boolean {
  return ignoreLines.some((pat) => {
    const p = pat.replace(/\/$/, '');
    if (repoPath === p || repoPath.startsWith(`${p}/`)) return true;
    if (!p.includes('/')) {
      const re = new RegExp(`^${p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
      return repoPath.split('/').some((seg) => re.test(seg));
    }
    const re = new RegExp(`^${p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`);
    return re.test(repoPath) || re.test(repoPath.replace(/^fe-next\//, ''));
  });
}

describe('.railwayignore vs Dockerfile COPY contract', () => {
  it('parses the runner-stage COPY sources', () => {
    expect(builderCopies).toContain('supabase');
  });

  // Build-output dirs are produced inside the image, so they are legitimately not uploaded.
  const builtInImage = new Set(['.next/standalone', '.next/static', 'dist']);

  it.each(builderCopies.filter((p) => !builtInImage.has(p)))(
    'does not exclude %s from the `railway up` upload',
    (p) => {
      expect(ignored(`fe-next/${p}`)).toBe(false);
    },
  );

  it('does not exclude the Dockerfile itself', () => {
    expect(ignored('fe-next/Dockerfile')).toBe(false);
  });
});
