import { NextRequest, NextResponse } from 'next/server';

// Bot probes for secrets / admin panels. Short-circuit with 404 before
// Next.js App Router renders `/[locale]` — renders were crashing with
// `controller[kState].transformAlgorithm is not a function` on Node 22
// (Sentry JAVASCRIPT-NEXTJS-NE).
const PROBE_RE = /^\/(\.env|\.git|\.aws|\.ssh|\.DS_Store|wp-admin|wp-login|wp-includes|wp-content|phpmyadmin|phpinfo|xmlrpc\.php|config\.json|credentials|secrets\.json|backup\.zip|admin\.php|\.well-known\/security\.txt)(\/|$)/i;

export function middleware(req: NextRequest) {
  if (PROBE_RE.test(req.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|api/|favicon\\.ico).*)'],
};
