import { canAccessFeature } from '@/backend/utils/featureFlags';
import { getServerExperimentVariant } from '@/lib/experimentsServer';
import { isWordMasteryEnvEnabled, resolveWordMasteryAccess } from './isEnabled';

export const WORD_MASTERY_DB_FLAG = 'word_mastery_v1';
export const WORD_MASTERY_EXPERIMENT = 'word-mastery-v1' as const;

export async function isWordMasteryEnabledFor(userId: string): Promise<boolean> {
  if (isWordMasteryEnvEnabled()) return true;
  const [dbFlagEnabled, experimentVariant] = await Promise.all([
    canAccessFeature(userId, WORD_MASTERY_DB_FLAG),
    getServerExperimentVariant(WORD_MASTERY_EXPERIMENT, userId),
  ]);
  return resolveWordMasteryAccess({
    envEnabled: false,
    dbFlagEnabled,
    experimentVariant,
  });
}
