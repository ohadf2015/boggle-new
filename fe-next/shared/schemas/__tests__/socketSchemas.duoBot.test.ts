/**
 * exp-mp-duo-bot-v1: the host's startGame may ask for a third-seat bot. zod's
 * z.object strips unknown keys, so without the field the request never reaches
 * the handler.
 */
import { StartGameSchema } from '../socketSchemas';

describe('StartGameSchema.duoBot', () => {
  it('keeps duoBot: true on the parsed payload', () => {
    const parsed = StartGameSchema.parse({ gameMode: 'classic', duoBot: true });
    expect(parsed.duoBot).toBe(true);
  });

  it('is optional (older clients omit it)', () => {
    const parsed = StartGameSchema.parse({ gameMode: 'classic' });
    expect(parsed.duoBot).toBeUndefined();
  });

  it('rejects a non-boolean', () => {
    expect(StartGameSchema.safeParse({ duoBot: 'yes' }).success).toBe(false);
  });
});
