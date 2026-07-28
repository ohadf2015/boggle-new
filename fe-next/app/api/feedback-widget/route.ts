import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { captureApiError } from '@/utils/sentry';
import { checkApiRateLimit, rateLimitResponse, addRateLimitHeaders } from '@/lib/apiRateLimit';

/**
 * Feedback Widget API Endpoint
 *
 * Same-origin proxy for the floating feedback widget (components/feedback/FeedbackWidget).
 * Forwards submissions to the feedback-devtools ingest API with the per-project
 * SDK token kept server-side — never shipped to the client, and no CORS
 * exposure for lexiclash.live on the ingest server.
 *
 * NOTE: distinct from /api/feedback (the in-game "Report a Bug" modal pipeline
 * that fans out to Supabase/Telegram/email). This endpoint feeds the
 * feedback-devtools triage dashboard instead.
 *
 * 1. Rate limits requests (5 per hour per IP)
 * 2. Validates + sanitizes the payload (size caps, data-URL screenshot only)
 * 3. Forwards with autoProcess disabled — user feedback is triaged by a
 *    human, never auto-handed to an agent.
 */

const DEFAULT_FEEDBACK_API_URL = 'https://server-production-14a9.up.railway.app';

const FEEDBACK_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 6 * 60 * 60 * 1000, // 6 hour block for abuse
};

const MAX_BODY_BYTES = 1_500_000; // ~1.5MB total (screenshot dominates)
const MAX_TEXT_CHARS = 2_000;
const MAX_SCREENSHOT_CHARS = 1_000_000; // ~750KB binary as base64 data URL
const FORWARD_TIMEOUT_MS = 10_000;

const CHANGE_TYPES = ['fix_bug', 'change_text', 'change_style', 'add_feature', 'improve_ux', 'other'] as const;
type ChangeType = (typeof CHANGE_TYPES)[number];

interface WidgetPayload {
  changeType: ChangeType;
  whatToChange: string;
  expectedBehavior: string;
  authorEmail?: string;
  screenshotDataUrl?: string;
  pageContext: {
    url: string;
    title?: string;
    viewport?: { width: number; height: number };
    userAgent?: string;
    locale?: string;
  };
}

function sanitizeText(value: unknown, maxChars: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxChars) return null;
  return trimmed;
}

function validatePayload(body: unknown): { payload?: WidgetPayload; error?: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Invalid body' };
  }
  const input = body as Record<string, unknown>;

  const changeType = CHANGE_TYPES.includes(input.changeType as ChangeType)
    ? (input.changeType as ChangeType)
    : 'other';

  const whatToChange = sanitizeText(input.whatToChange, MAX_TEXT_CHARS);
  if (!whatToChange) {
    return { error: 'whatToChange is required (1-2000 chars)' };
  }

  // expectedBehavior is required by the ingest schema; for free-form user
  // feedback we fall back to the message itself when the widget sends none.
  const expectedBehavior =
    sanitizeText(input.expectedBehavior, MAX_TEXT_CHARS) || whatToChange;

  let authorEmail: string | undefined;
  if (typeof input.authorEmail === 'string' && input.authorEmail.trim().length > 0) {
    const candidate = input.authorEmail.trim();
    if (candidate.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
      authorEmail = candidate;
    }
  }

  let screenshotDataUrl: string | undefined;
  if (typeof input.screenshotDataUrl === 'string') {
    const shot = input.screenshotDataUrl;
    if (shot.startsWith('data:image/') && shot.length <= MAX_SCREENSHOT_CHARS) {
      screenshotDataUrl = shot;
    }
  }

  const rawCtx = (typeof input.pageContext === 'object' && input.pageContext !== null
    ? input.pageContext
    : {}) as Record<string, unknown>;

  const url = typeof rawCtx.url === 'string' && rawCtx.url.length > 0 && rawCtx.url.length <= 2048
    ? rawCtx.url
    : null;
  if (!url) {
    return { error: 'pageContext.url is required' };
  }

  const pageContext: WidgetPayload['pageContext'] = { url };
  if (typeof rawCtx.title === 'string') pageContext.title = rawCtx.title.slice(0, 300);
  if (typeof rawCtx.userAgent === 'string') pageContext.userAgent = rawCtx.userAgent.slice(0, 500);
  if (typeof rawCtx.locale === 'string') pageContext.locale = rawCtx.locale.slice(0, 10);
  const vp = rawCtx.viewport as Record<string, unknown> | undefined;
  if (vp && typeof vp.width === 'number' && typeof vp.height === 'number') {
    pageContext.viewport = {
      width: Math.min(Math.max(Math.round(vp.width), 0), 10000),
      height: Math.min(Math.max(Math.round(vp.height), 0), 10000),
    };
  }

  return {
    payload: { changeType, whatToChange, expectedBehavior, authorEmail, screenshotDataUrl, pageContext },
  };
}

export async function POST(request: NextRequest) {
  const rateLimitResult = checkApiRateLimit(request, '/api/feedback-widget', FEEDBACK_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  const sdkToken = process.env.FEEDBACK_SDK_TOKEN;
  const feedbackApiUrl = process.env.FEEDBACK_API_URL || DEFAULT_FEEDBACK_API_URL;
  if (!sdkToken) {
    logger.warn('[FeedbackWidget] FEEDBACK_SDK_TOKEN not configured');
    return NextResponse.json({ error: 'Feedback is temporarily unavailable' }, { status: 503 });
  }

  // Cheap size guard before parsing — screenshots dominate payload size.
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { payload, error } = validatePayload(body);
  if (!payload) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);
    let upstream: Response;
    try {
      upstream = await fetch(`${feedbackApiUrl}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sdk-token': sdkToken,
        },
        body: JSON.stringify({
          changeType: payload.changeType,
          whatToChange: payload.whatToChange,
          expectedBehavior: payload.expectedBehavior,
          authorEmail: payload.authorEmail,
          screenshotDataUrl: payload.screenshotDataUrl,
          pageContext: payload.pageContext,
          priority: 'medium',
          autoProcess: false,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      logger.warn(`[FeedbackWidget] Upstream rejected submission: ${upstream.status} ${detail.slice(0, 200)}`);
      return addRateLimitHeaders(
        NextResponse.json({ error: 'Could not submit feedback' }, { status: 502 }),
        rateLimitResult,
        FEEDBACK_RATE_LIMIT.maxRequests
      );
    }

    const created = (await upstream.json().catch(() => ({}))) as { id?: string };
    logger.log(`[FeedbackWidget] Submission forwarded (id=${created.id || 'unknown'}, type=${payload.changeType}, screenshot=${Boolean(payload.screenshotDataUrl)})`);

    return addRateLimitHeaders(
      NextResponse.json({ ok: true, id: created.id }),
      rateLimitResult,
      FEEDBACK_RATE_LIMIT.maxRequests
    );
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), '/api/feedback-widget');
    return NextResponse.json({ error: 'Could not submit feedback' }, { status: 500 });
  }
}
