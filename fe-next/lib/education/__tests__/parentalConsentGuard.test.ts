import fs from 'fs';
import path from 'path';
import { allStatements, finalPolicies, MIGRATIONS_DIR } from './helpers/migrationState';

const latest = (re: RegExp) => {
  const file = fs.readdirSync(MIGRATIONS_DIR).sort().reverse().find((f) => re.test(f));
  return file ? fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8').toLowerCase().replace(/\s+/g, ' ') : '';
};

describe('parental consent records', () => {
  it('no surviving SELECT policy hands parent email, IP or user agent to someone other than the child', () => {
    const selects = finalPolicies('parental_consents', allStatements()).filter((p) => /\bfor (select|all)\b/.test(p.sql));
    for (const p of selects) {
      const using = p.sql.split(/\busing\b/)[1] ?? '';
      expect({ name: p.name, ownRowOnly: /auth\.uid\(\)\s*(\)\s*)?=\s*user_id/.test(using) && !/\bor\b/.test(using) }).toEqual({
        name: p.name,
        ownRowOnly: true,
      });
    }
  });

  describe('teacher consent status', () => {
    const sql = latest(/consent_status/);

    it('returns status columns only', () => {
      expect(sql).toMatch(/returns table ?\(student_id uuid, has_consent boolean, consent_given_at timestamptz\)/);
      expect(sql).not.toMatch(/returns table[^;]*(parent_email|ip_address|user_agent)/);
    });

    it('answers only the classroom owner', () => {
      expect(sql).toMatch(/is_classroom_owner\(p_classroom_id, auth\.uid\(\)\)/);
    });

    it('closes the age/consent oracle to strangers', () => {
      expect(sql.match(/check_user_id = auth\.uid\(\) or public\.is_teacher_of_student\(check_user_id\)/g)?.length).toBe(2);
    });
  });
});
