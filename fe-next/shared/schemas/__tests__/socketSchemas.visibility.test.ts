import { CreateGameSchema } from '../socketSchemas';

describe('CreateGameSchema.visibility', () => {
  const base = { gameCode: 'ABCD12', roomName: 'Room', hostUsername: 'Ada' };

  it.each(['public', 'friends', 'private'] as const)('Given visibility %s, When parsed, Then it is kept', (v) => {
    expect(CreateGameSchema.parse({ ...base, visibility: v }).visibility).toBe(v);
  });

  it('Given an older client that sends no visibility, When parsed, Then the room is public', () => {
    expect(CreateGameSchema.parse(base).visibility).toBe('public');
  });

  it('Given a value outside the whitelist, When parsed, Then the payload is rejected', () => {
    expect(CreateGameSchema.safeParse({ ...base, visibility: 'secret' }).success).toBe(false);
  });
});
