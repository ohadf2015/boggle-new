export type Mark = 'b' | 'y' | 'g';

const NEXT: Record<Mark, Mark> = { b: 'y', y: 'g', g: 'b' };

export function cycleMark(mark: Mark): Mark {
  return NEXT[mark];
}
