import fs from 'fs';
import path from 'path';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { allStatements, finalPolicies, finalTriggers, MIGRATIONS_DIR } from './helpers/migrationState';

const latest = (re: RegExp) => {
  const file = fs.readdirSync(MIGRATIONS_DIR).sort().reverse().find((f) => re.test(f));
  return file ? fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8').toLowerCase() : '';
};

describe('classroom_memberships inserts', () => {
  const statements = allStatements();

  it('no surviving insert policy lets a student enrol themselves', () => {
    const inserts = finalPolicies('classroom_memberships', statements).filter((p) => /\bfor (insert|all)\b/.test(p.sql));
    expect(inserts.length).toBeGreaterThan(0);
    for (const p of inserts) {
      const check = p.sql.split('with check')[1] ?? '';
      expect({ name: p.name, selfInsert: /=\s*student_id|student_id\s*=/.test(check) }).toEqual({ name: p.name, selfInsert: false });
    }
  });

  it('a seat-cap trigger runs before every insert', () => {
    const triggers = finalTriggers('classroom_memberships', statements).filter((t) => /before insert/.test(t.sql));
    expect(triggers.map((t) => t.name)).toContain('enforce_free_student_cap');
  });
});

describe('classrooms inserts', () => {
  it('a class-cap trigger runs before every insert', () => {
    const triggers = finalTriggers('classrooms', allStatements()).filter((t) => /before insert/.test(t.sql));
    expect(triggers.map((t) => t.name)).toContain('enforce_free_classroom_cap');
  });
});

describe('free-tier cap migration', () => {
  const sql = latest(/free_tier_caps/);

  it('uses the same numbers the app advertises', () => {
    expect(sql).toMatch(new RegExp(`v_class_limit constant integer := ${FREE_TIER_LIMITS.classes};`));
    expect(sql).toMatch(new RegExp(`v_student_limit constant integer := ${FREE_TIER_LIMITS.studentsPerClass};`));
  });

  it('serialises concurrent creates per teacher and joins per class', () => {
    expect(sql).toMatch(/pg_advisory_xact_lock\(hashtextextended\('classroom_cap:' \|\| new\.teacher_id::text, 0\)\)/);
    expect(sql).toMatch(/pg_advisory_xact_lock\(hashtextextended\('student_cap:' \|\| new\.classroom_id::text, 0\)\)/);
  });

  it('does not count the teacher previewing their own class as a student', () => {
    expect(sql).toMatch(/new\.student_id = v_teacher/);
    expect(sql).toMatch(/student_id <> v_teacher/);
  });

  it('lifts caps for provider Pro (active or trialing) and live admin grants only', () => {
    expect(sql).toMatch(/s\.tier = 'pro'/);
    expect(sql).toMatch(/coalesce\(s\.source, 'polar'\) <> 'admin_grant' and s\.status in \('active', 'trialing'\)/);
    expect(sql).toMatch(/s\.source = 'admin_grant' and s\.status = 'active' and s\.current_period_end > now\(\)/);
  });

  it('raises the codes the routes map to the upgrade sheet', () => {
    expect(sql).toContain("raise exception 'class_limit_reached'");
    expect(sql).toContain("raise exception 'student_limit_reached'");
  });

  it('rejects blank class names without failing on existing rows', () => {
    expect(sql).toMatch(/check \(length\(btrim\(name\)\) > 0\) not valid/);
  });
});
