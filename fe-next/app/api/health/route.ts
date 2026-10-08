import { NextResponse } from 'next/server';
import { deployHealthPayload, DEPLOY_HEALTH_HEADERS } from '@/lib/buildIdentity';

/**
 * Fallback if a request reaches Next instead of Express (next dev without
 * the custom server). Production Express registers GET /api/health first.
 */
export async function GET() {
  return NextResponse.json(deployHealthPayload(), {
    headers: { ...DEPLOY_HEALTH_HEADERS },
  });
}
