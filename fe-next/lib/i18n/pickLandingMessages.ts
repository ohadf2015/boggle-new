export const PARTIAL_FLAG = '__partial';

export function pickLandingMessages(
  catalogue: Record<string, unknown>,
  namespaces: readonly string[],
  extraKeys: readonly string[] = [],
): Record<string, unknown> {
  const out: Record<string, unknown> = { [PARTIAL_FLAG]: true };

  for (const ns of namespaces) {
    if (catalogue[ns] !== undefined) {
      out[ns] = catalogue[ns];
    }
  }

  for (const path of extraKeys) {
    graftKey(catalogue, out, path.split('.'));
  }

  return out;
}

function graftKey(
  sourceRoot: Record<string, unknown>,
  destRoot: Record<string, unknown>,
  parts: string[],
): void {
  let src: unknown = sourceRoot;
  let dst: Record<string, unknown> = destRoot;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (typeof src !== 'object' || src === null || !(part in (src as Record<string, unknown>))) {
      return;
    }
    const next = (src as Record<string, unknown>)[part];
    if (i === parts.length - 1) {
      dst[part] = next;
      return;
    }
    if (typeof dst[part] !== 'object' || dst[part] === null || Array.isArray(dst[part])) {
      dst[part] = {};
    }
    dst = dst[part] as Record<string, unknown>;
    src = next;
  }
}
