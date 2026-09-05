import { describe, it, expect } from 'vitest';
import { migrationPendingHint } from '../migrationPendingHint';

describe('migrationPendingHint', () => {
  it('recognizes an undefined-table Postgres error (42P01)', () => {
    const hint = migrationPendingHint({ code: '42P01', message: 'relation "teacher_pro_grants" does not exist' });
    expect(hint).toContain('migration pending');
    expect(hint).toContain('teacher_pro_grants');
  });

  it('recognizes a PostgREST schema-cache miss (PGRST205)', () => {
    const hint = migrationPendingHint({ code: 'PGRST205', message: "Could not find the table 'public.teacher_pro_grants' in the schema cache" });
    expect(hint).toContain('migration pending');
  });

  it('recognizes an undefined function error without a matching code, by message', () => {
    const hint = migrationPendingHint({ message: 'Could not find the function public.find_user_id_by_email(p_email) in the schema cache' });
    expect(hint).toContain('migration pending');
  });

  it('returns null for an unrelated error', () => {
    const hint = migrationPendingHint({ code: '42501', message: 'permission denied for table teacher_pro_grants' });
    expect(hint).toBeNull();
  });

  it('returns null for no error', () => {
    expect(migrationPendingHint(null)).toBeNull();
    expect(migrationPendingHint(undefined)).toBeNull();
  });
});
