import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { buildDeploymentInfo, type DeploymentChangelog } from '@/lib/admin/deploymentInfo';
import changelog from '@/lib/admin/deploymentChangelog.generated.json';

// The live "latest deploy" headline reads runtime env, so never cache this.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const info = buildDeploymentInfo(
    process.env as Record<string, string | undefined>,
    changelog as DeploymentChangelog,
    Date.now(),
    process.uptime(),
  );

  return NextResponse.json({ success: true, data: info });
}
