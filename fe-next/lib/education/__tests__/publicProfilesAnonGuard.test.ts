import { allStatements } from './helpers/migrationState';

const statements = allStatements();
const lastIndex = (re: RegExp) => statements.map((s) => re.test(s.sql)).lastIndexOf(true);

const lastCreate = statements[lastIndex(/^create (or replace )?view (public\.)?public_profiles\b/)];
const anonGrants = statements.filter((s) => /^grant select .* on (table )?(public\.)?public_profiles to anon\b/.test(s.sql));
const lastAnonGrant = anonGrants.at(-1);

describe('public_profiles for logged-out callers', () => {
  it('keeps definer semantics (friends and leaderboards read other players through it)', () => {
    expect(lastCreate.sql.split(/\sas\s/)[0]).not.toMatch(/security_invoker/);
  });

  it('hides classroom students and consent-tracked minors from anon only', () => {
    expect(lastCreate.sql).toMatch(/current_user <> 'anon'/);
    expect(lastCreate.sql).toMatch(/not exists \(select 1 from public\.classroom_memberships m where m\.student_id = p\.id\)/);
    expect(lastCreate.sql).toMatch(/not exists \(select 1 from public\.parental_consents pc where pc\.user_id = p\.id\)/);
  });

  it('never grants anon presence data', () => {
    expect(lastAnonGrant).toBeDefined();
    expect(lastAnonGrant!.sql).toMatch(/^grant select \(/);
    expect(lastAnonGrant!.sql).not.toMatch(/last_seen_at/);
    const revokeAfter = statements.findIndex(
      (s, i) => i > lastIndex(/^create (or replace )?view (public\.)?public_profiles\b/) && /^revoke all on (public\.)?public_profiles from anon/.test(s.sql),
    );
    expect(revokeAfter).toBeGreaterThan(-1);
  });
});
