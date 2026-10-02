import type { ClassGapSharePayload } from '@/lib/education/classGapShare';
import { loadTranslation } from '@/translations/loadTranslation';

export type UnpluggedMode = 'classic' | 'teamTiles' | 'reteach';

function readString(catalogue: unknown, path: string): string | null {
  let node: unknown = catalogue;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return null;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : null;
}

export async function unpluggedTitle(payload: ClassGapSharePayload, mode: UnpluggedMode): Promise<string> {
  const catalogue = await loadTranslation(payload.locale);
  const modeName = readString(catalogue, `eg2Fix.unplugged.${mode}`) ?? 'LexiClash Unplugged';
  return payload.lesson ? `${payload.lesson} · ${modeName}` : modeName;
}
