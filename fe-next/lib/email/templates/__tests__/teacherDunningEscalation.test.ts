import { describe, expect, it } from 'vitest';
import { teacherDunningEscalation } from '../teacherDunningEscalation';

const RECOVER = 'https://www.lexiclash.live/api/subscription/recover?t=signed&locale=en';

describe('teacherDunningEscalation', () => {
  it('puts the one-click recover link on the card CTA and does not send the teacher to sign in first', () => {
    const { subject, html } = teacherDunningEscalation({
      full_name: 'Wings Teacher',
      locale: 'en',
      portalUrl: RECOVER,
    });
    expect(subject).toContain('still unpaid');
    expect(html).toContain('href="https://www.lexiclash.live/api/subscription/recover?t=signed&amp;locale=en"');
    expect(html).toContain('Update my card');
    expect(html).toContain('One click');
    expect(html).not.toContain('/teacher/upgrade');
    expect(html).not.toContain('/api/subscription/checkout');
  });

  it('renders Hebrew RTL', () => {
    const { subject, html } = teacherDunningEscalation({
      full_name: 'מורה',
      locale: 'he',
      portalUrl: RECOVER,
    });
    expect(subject).toContain('לא שולם');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('לעדכן את הכרטיס');
  });
});
