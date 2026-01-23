import { z } from 'zod';

/**
 * Schema for WorldTransition composition props.
 * Validates world IDs and locale for video rendering.
 */
export const WorldTransitionSchema = z.object({
  fromWorldId: z.enum(['meadows', 'springs', 'caverns']),
  toWorldId: z.enum(['meadows', 'springs', 'caverns']),
  locale: z.enum(['en', 'he', 'sv', 'ja']),
});

export type WorldTransitionProps = z.infer<typeof WorldTransitionSchema>;
