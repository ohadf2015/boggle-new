import { describe, it, expect } from 'vitest';
import { teacherAccessAdminNotify } from '../teacherAccessAdminNotify';
import { teacherAccessConfirmation } from '../teacherAccessConfirmation';
import { teacherAccessDecline } from '../teacherAccessDecline';

const baseReq = {
  full_name: 'Jane Doe',
  email: 'jane@school.edu',
  role: 'teacher' as const,
  school_or_org: 'Riverdale High',
  country: 'US',
  locale: 'en' as const,
  use_case: '9th grade ESL teacher, 25 students.',
};

describe('teacher access email templates', () => {
  it('admin notify includes applicant name + email + use_case', () => {
    const out = teacherAccessAdminNotify(baseReq);
    expect(out.subject).toContain('Teacher Access Request');
    expect(out.html).toContain('Jane Doe');
    expect(out.html).toContain('jane@school.edu');
    expect(out.html).toContain('9th grade ESL teacher');
    expect(out.html).toContain('Riverdale High');
  });

  it('confirmation greets applicant + says access is live, from Ohad personally', () => {
    const out = teacherAccessConfirmation({ full_name: 'Jane', locale: 'en' });
    expect(out.subject.toLowerCase()).toContain('live');
    expect(out.html).toContain('Jane');
    expect(out.html).toContain('/teacher');
    expect(out.html).toContain('ohadf2015@gmail.com');
  });

  it('decline is polite + reasoned + invites regular game', () => {
    const out = teacherAccessDecline({ full_name: 'Jane', locale: 'en', reason: 'incomplete' });
    expect(out.html).toContain('Jane');
    expect(out.html).toContain('incomplete');
    expect(out.html.toLowerCase()).toContain('regular');
  });

  it('locale=he produces Hebrew content', () => {
    const out = teacherAccessConfirmation({ full_name: 'יעל', locale: 'he' });
    expect(out.html).toMatch(/[֐-׿]/);
  });

  it('escapes HTML in user-provided fields', () => {
    const out = teacherAccessAdminNotify({ ...baseReq, full_name: '<script>alert(1)</script>' });
    expect(out.html).not.toContain('<script>alert(1)</script>');
    expect(out.html).toContain('&lt;script&gt;');
  });
});
