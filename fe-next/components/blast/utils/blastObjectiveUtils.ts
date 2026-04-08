/**
 * blastObjectiveUtils — pure helper functions for wave objectives.
 * No React dependencies — trivially testable.
 */

import type { BlastObjective, BlastTileType } from '../types';

/**
 * Extract unique tile types referenced by objectives (collect_type, clear_all_type).
 * Used to highlight objective-relevant tiles on the grid.
 */
export function getObjectiveTileTypes(objectives: BlastObjective[]): BlastTileType[] {
  const types = new Set<BlastTileType>();
  for (const obj of objectives) {
    if ((obj.type === 'collect_type' || obj.type === 'clear_all_type') && obj.tileType) {
      types.add(obj.tileType);
    }
  }
  return Array.from(types);
}

/**
 * Format a human-readable label for an objective, using translation function.
 * Supports template variables: {target}, {tileType}, {minWordLength}.
 */
export function formatObjectiveLabel(
  objective: BlastObjective,
  t: (key: string) => string | undefined,
): string {
  let template: string;

  switch (objective.type) {
    case 'score_target':
      template = t('blast.objective.scoreTarget') || 'Score {target} points';
      break;
    case 'collect_type':
      template = t('blast.objective.collectType') || 'Collect {target} {tileType} tiles';
      break;
    case 'clear_all_type':
      template = t('blast.objective.clearAllType') || 'Clear all {tileType} tiles';
      break;
    case 'word_length':
      template = t('blast.objective.wordLength') || 'Find {target} words with {minWordLength}+ letters';
      break;
    case 'clear_percent':
      template = t('blast.objective.clearPercent') || 'Clear {target}% of the board';
      break;
    default:
      template = '';
  }

  return template
    .replace('{target}', String(objective.target))
    .replace('{tileType}', objective.tileType || '')
    .replace('{minWordLength}', String(objective.minWordLength || 0));
}
