import { describe, it, expect, vi } from 'vitest';
import {
  planGrantFromPolarCheckout,
  grantProOnCheckoutReturn,
  type PolarCheckoutSnapshot,
} from '../grantProOnCheckoutReturn';

const PRO = 'prod_teacher_pro';
const USER = 'teacher-1';

function checkout(overrides: PolarCheckoutSnapshot = {}): PolarCheckoutSnapshot {
  return {
    id: '4b9c2f1e-7a3d-4c5e-9f0a-1b2c3d4e5f6a',
    status: 'succeeded',
    external_customer_id: USER,
    product_id: PRO,
    subscription_id: 'sub_1',
    order_id: 'ord_1',
    current_period_end: '2026-12-28T00:00:00Z',
    metadata: { user_id: USER },
    ...overrides,
  };
}

describe('planGrantFromPolarCheckout', () => {
  it('grants paid Pro when Polar says the checkout succeeded for this teacher', () => {
    expect(planGrantFromPolarCheckout(checkout(), { authedUserId: USER, proProductId: PRO })).toEqual({
      ok: true,
      status: 'active',
      providerSubscriptionId: 'sub_1',
      providerOrderId: 'ord_1',
      providerProductId: PRO,
      currentPeriodEnd: '2026-12-28T00:00:00Z',
    });
  });

  it('treats confirmed / complete the same as succeeded', () => {
    for (const status of ['confirmed', 'complete', 'completed']) {
      const plan = planGrantFromPolarCheckout(checkout({ status }), { authedUserId: USER, proProductId: PRO });
      expect(plan.ok).toBe(true);
    }
  });

  it('does not grant an open, expired, or failed checkout', () => {
    for (const status of ['open', 'expired', 'failed', '', undefined]) {
      const plan = planGrantFromPolarCheckout(checkout({ status }), { authedUserId: USER, proProductId: PRO });
      expect(plan).toEqual({ ok: false, reason: 'not_success' });
    }
  });

  it('does not grant another teacher’s checkout, even when Polar marks it succeeded', () => {
    expect(planGrantFromPolarCheckout(checkout(), { authedUserId: 'other-teacher', proProductId: PRO })).toEqual({
      ok: false,
      reason: 'not_owner',
    });
  });

  it('does not grant when Polar sent no owner id', () => {
    const plan = planGrantFromPolarCheckout(
      checkout({ external_customer_id: undefined, metadata: {}, customer: {} }),
      { authedUserId: USER, proProductId: PRO },
    );
    expect(plan).toEqual({ ok: false, reason: 'not_owner' });
  });

  it('accepts owner from metadata.teacher_id or customer.external_id', () => {
    const fromMeta = planGrantFromPolarCheckout(
      checkout({ external_customer_id: undefined, metadata: { teacher_id: USER } }),
      { authedUserId: USER, proProductId: PRO },
    );
    expect(fromMeta.ok).toBe(true);
    const fromCustomer = planGrantFromPolarCheckout(
      checkout({ external_customer_id: undefined, metadata: {}, customer: { external_id: USER } }),
      { authedUserId: USER, proProductId: PRO },
    );
    expect(fromCustomer.ok).toBe(true);
  });

  it('does not grant a foreign Polar product', () => {
    expect(
      planGrantFromPolarCheckout(checkout({ product_id: 'prod_other' }), { authedUserId: USER, proProductId: PRO }),
    ).toEqual({ ok: false, reason: 'foreign_product' });
  });

  it('does not grant when the Teacher Pro product id is not configured', () => {
    expect(planGrantFromPolarCheckout(checkout(), { authedUserId: USER, proProductId: null })).toEqual({
      ok: false,
      reason: 'missing_product',
    });
  });

  it('reads the product id from products[0] when Polar omits product_id', () => {
    const plan = planGrantFromPolarCheckout(
      checkout({ product_id: undefined, products: [{ id: PRO }] }),
      { authedUserId: USER, proProductId: PRO },
    );
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.providerProductId).toBe(PRO);
  });

  it('marks a trial checkout as trialing and uses trial_end as the period end', () => {
    const plan = planGrantFromPolarCheckout(
      checkout({
        metadata: { user_id: USER, trial: true },
        trial_end: '2026-12-12T00:00:00Z',
        current_period_end: '2027-01-12T00:00:00Z',
      }),
      { authedUserId: USER, proProductId: PRO },
    );
    expect(plan).toMatchObject({ ok: true, status: 'trialing', currentPeriodEnd: '2026-12-12T00:00:00Z' });
  });

  it('reads subscription and order ids from nested Polar objects', () => {
    const plan = planGrantFromPolarCheckout(
      checkout({
        subscription_id: undefined,
        order_id: undefined,
        subscription: { id: 'sub_nested', current_period_end: '2026-12-30T00:00:00Z' },
        order: { id: 'ord_nested' },
        current_period_end: undefined,
      }),
      { authedUserId: USER, proProductId: PRO },
    );
    expect(plan).toMatchObject({
      ok: true,
      providerSubscriptionId: 'sub_nested',
      providerOrderId: 'ord_nested',
      currentPeriodEnd: '2026-12-30T00:00:00Z',
    });
  });
});

describe('grantProOnCheckoutReturn', () => {
  it('writes the Pro grant when the plan is eligible', async () => {
    const grant = vi.fn(async () => undefined);
    await expect(
      grantProOnCheckoutReturn({ checkout: checkout(), authedUserId: USER, proProductId: PRO, grant }),
    ).resolves.toBe('granted');
    expect(grant).toHaveBeenCalledWith({
      userId: USER,
      status: 'active',
      providerSubscriptionId: 'sub_1',
      providerOrderId: 'ord_1',
      providerProductId: PRO,
      currentPeriodEnd: '2026-12-28T00:00:00Z',
    });
  });

  it('skips the write when the checkout is not this teacher’s succeeded Pro session', async () => {
    const grant = vi.fn(async () => undefined);
    await expect(
      grantProOnCheckoutReturn({
        checkout: checkout({ status: 'expired' }),
        authedUserId: USER,
        proProductId: PRO,
        grant,
      }),
    ).resolves.toBe('skipped');
    expect(grant).not.toHaveBeenCalled();
  });

  it('returns failed when the grant write throws, so the beacon can still answer 204', async () => {
    const grant = vi.fn(async () => {
      throw new Error('db down');
    });
    await expect(
      grantProOnCheckoutReturn({ checkout: checkout(), authedUserId: USER, proProductId: PRO, grant }),
    ).resolves.toBe('failed');
  });
});
