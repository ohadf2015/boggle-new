export type OvationTier = 'none' | 'small' | 'big' | 'mega';

export function classifyOvation(chainDepth: number): OvationTier {
  if (chainDepth >= 5) return 'mega';
  if (chainDepth >= 3) return 'big';
  if (chainDepth >= 2) return 'small';
  return 'none';
}
