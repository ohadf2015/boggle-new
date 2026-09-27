/** One submitted word, as the screen saw it — the single event every juice/stage/fx layer reacts to. */
export interface HitEvent {
  id: number;
  word: string;
  /** Points the word dealt (relic-modified, same formula the server settles). 0 when rejected. */
  pts: number;
  result: 'ok' | 'dup' | 'invalid' | 'short' | 'chain';
  /** Praise override (a deed's name), so the word's bubble and the deed stamp agree. */
  praiseKey?: string;
}
