import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { isProductionBillingDeploy } from '@/lib/polarBillingRuntime';

/**
 * Admin: is Polar billing actually wired on THIS deployment.
 * Reports presence (never values) of the three env vars checkout and the
 * webhook route gate on, plus whether a production deploy is still pointed
 * at Polar sandbox — the thing a route-code read can't tell you.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.success) {
    return auth.response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isProductionDeploy = isProductionBillingDeploy();
  const polarEnvironment = process.env.POLAR_ENVIRONMENT ?? null;

  return NextResponse.json({
    accessTokenSet: Boolean(process.env.POLAR_ACCESS_TOKEN),
    proProductIdSet: Boolean(process.env.POLAR_PRO_PRODUCT_ID),
    webhookSecretSet: Boolean(process.env.POLAR_WEBHOOK_SECRET),
    polarEnvironment,
    isProductionDeploy,
    sandboxInProduction: isProductionDeploy && polarEnvironment === 'sandbox',
  });
}
