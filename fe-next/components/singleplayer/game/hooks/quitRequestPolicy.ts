/**
 * Pure decision behind useSinglePlayerCore.handleQuitRequest.
 * Extracted so the quit rules are testable without mounting the 500-line hook.
 */
export type QuitAction = 'finishPractice' | 'confirm' | 'quit';

export interface QuitResolution {
  /** emit game_abandon_attempted — only for genuine non-practice quits */
  trackAbandon: boolean;
  action: QuitAction;
}

export function resolveQuitRequest(mode: string, score: number): QuitResolution {
  if (mode === 'practice') return { trackAbandon: false, action: 'finishPractice' };
  return { trackAbandon: true, action: score > 0 ? 'confirm' : 'quit' };
}
