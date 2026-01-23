import { z } from 'zod';

/**
 * Zod schema for LevelIntro composition props.
 * Validates worldId and locale for parameterized rendering.
 */
export const LevelIntroSchema = z.object({
  worldId: z.enum(['meadows', 'springs', 'caverns']),
  locale: z.enum(['en', 'he', 'sv', 'ja']),
});

export type LevelIntroProps = z.infer<typeof LevelIntroSchema>;
