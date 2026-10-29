/**
 * exp-mp-duo-bot-v1: the host's startGame may ask for a third-seat bot. zod's
 * z.object strips unknown keys, so without the field the request never reaches
 * the handler.
 */
import { CreateGameSchema, StartGameSchema } from '../socketSchemas';

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

describe('CreateGameSchema.isQuickPlay', () => {
  const base = { gameCode: 'ABCD12', roomName: 'Room', hostUsername: 'Ada' };

  it('keeps isQuickPlay: true so the server knows Quick Play made the room', () => {
    expect(CreateGameSchema.parse({ ...base, isQuickPlay: true }).isQuickPlay).toBe(true);
  });

  it('defaults to false for rooms made with Create Room and for older clients', () => {
    expect(CreateGameSchema.parse(base).isQuickPlay).toBe(false);
  });
});
