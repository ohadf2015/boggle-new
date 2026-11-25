import { JoinGameSchema } from '../socketSchemas';

describe('JoinGameSchema.authToken', () => {
  const base = { gameCode: 'ABCD12', username: 'Ada' };

  it('Given a join with an access token, When parsed, Then the token reaches the handler', () => {
    expect(JoinGameSchema.parse({ ...base, authToken: 'a.b.c' }).authToken).toBe('a.b.c');
  });

  it('Given an oversized token, When parsed, Then the payload is rejected', () => {
    expect(JoinGameSchema.safeParse({ ...base, authToken: 'x'.repeat(4097) }).success).toBe(false);
  });
});
