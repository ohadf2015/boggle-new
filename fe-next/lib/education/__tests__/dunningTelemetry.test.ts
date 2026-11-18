import { describe, expect, it } from 'vitest';
import { buildDunningEmailSentEvent, buildRecoveryCtaClickedEvent } from '../proFunnelServer';

describe('dunning recovery telemetry', () => {
  it('names dunning_email_sent with the grace day, and recovery_cta_clicked with the surface', () => {
    expect(buildDunningEmailSentEvent('u-1', 5)).toEqual({
      distinctId: 'u-1',
      event: 'dunning_email_sent',
      properties: { product: 'teacher_pro', provider: 'polar', day: 5, teacher_id: 'u-1' },
    });
    expect(buildRecoveryCtaClickedEvent('u-1', { surface: 'dunning_email', day: 5 })).toEqual({
      distinctId: 'u-1',
      event: 'recovery_cta_clicked',
      properties: { product: 'teacher_pro', provider: 'polar', surface: 'dunning_email', day: 5, teacher_id: 'u-1' },
    });
  });
});
