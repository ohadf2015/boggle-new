/**
 * API Route: /api/validate-word-ai
 * AI validation has been disabled. Words are validated against dictionary only.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({
    isValid: false,
    reason: 'AI validation is no longer available. Words are validated against the dictionary only.',
    source: 'dictionary',
  });
}
