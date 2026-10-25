import fs from 'fs';
import path from 'path';
import { allStatements, finalViewState, MIGRATIONS_DIR } from './helpers/migrationState';

const STUDENT_DATA_VIEWS = ['student_practice_progress'];

describe('views over student data', () => {
  const statements = allStatements();

  it.each(STUDENT_DATA_VIEWS)('%s ends up security_invoker and closed to anon', (view) => {
    const state = finalViewState(view, statements);
    expect(state.lastFile).not.toBeNull();
    expect(state.securityInvoker).toBe(true);
    expect(state.anonHasAccess).toBe(false);
  });

  it('the parser sees a plain re-CREATE as dropping security_invoker', () => {
    const replay = finalViewState('v', [
      { file: 'a', sql: 'create view public.v with (security_invoker = true) as select 1' },
      { file: 'b', sql: 'revoke all on public.v from anon' },
      { file: 'c', sql: 'create or replace view public.v as select 1' },
    ]);
    expect(replay).toEqual({ securityInvoker: false, anonHasAccess: true, lastFile: 'c' });
  });

  it('keeps signed-in SELECT on the practice view and no writes', () => {
    const file = fs
      .readdirSync(MIGRATIONS_DIR)
      .sort()
      .reverse()
      .find((f) => /student_practice_progress/.test(f));
    expect(file).toBeDefined();
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file!), 'utf8').toLowerCase();
    expect(sql).toMatch(/revoke all on public\.student_practice_progress from anon, authenticated/);
    expect(sql).toMatch(/grant select on public\.student_practice_progress to authenticated/);
  });
});
