import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import logger from '@/utils/logger';
import { withCronLock } from '@/backend/redis/locking';
import { EN_POSTS, HE_POSTS } from '@/lib/instagram/postCalendar';

export const maxDuration = 60;

// Content calendar (EN + HE, by day of week) lives in lib/instagram/postCalendar.ts,
// shared with scripts/instagram-publisher.ts.

// ---------------------------------------------------------------------------
// Instagram Graph API
// ---------------------------------------------------------------------------

const GRAPH_API = 'https://graph.facebook.com/v21.0';

async function createAndPublish(
  accountId: string,
  token: string,
  imageUrl: string,
  caption: string,
  hashtags: string,
  label: string
): Promise<{ mediaId: string }> {
  // Step 1: Create media container
  logger.log(`[IG:${label}] Creating container for ${imageUrl}`);
  const containerRes = await fetch(`${GRAPH_API}/${accountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  });
  const container = await containerRes.json() as { id?: string; error?: { message: string } };
  if (container.error) throw new Error(`Container: ${container.error.message}`);

  // Step 2: Wait for processing
  logger.log(`[IG:${label}] Waiting for image processing...`);
  await new Promise((r) => setTimeout(r, 12_000));

  // Step 3: Publish
  logger.log(`[IG:${label}] Publishing...`);
  const publishRes = await fetch(`${GRAPH_API}/${accountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: container.id, access_token: token }),
  });
  const published = await publishRes.json() as { id?: string; error?: { message: string } };
  if (published.error) throw new Error(`Publish: ${published.error.message}`);

  // Step 4: Hashtags as first comment
  if (hashtags) {
    logger.log(`[IG:${label}] Adding hashtags comment...`);
    await fetch(`${GRAPH_API}/${published.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: hashtags, access_token: token }),
    });
  }

  logger.log(`[IG:${label}] Done! Media ID: ${published.id}`);
  return { mediaId: published.id! };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * Cron Job: Instagram Auto-Publisher
 *
 * Posts today's content to EN and/or HE Instagram accounts.
 *
 * Query params:
 *   ?lang=en    Post EN only
 *   ?lang=he    Post HE only
 *   (none)      Post both
 *
 * Scheduling:
 *   External cron (cron-job.org / Railway cron):
 *   - EN: 0 16 * * 0-5  (16:00 UTC = 18:00 Israel)
 *     URL: https://lexiclash.live/api/cron/instagram-post?lang=en
 *   - HE: 0 18 * * 0-5  (18:00 UTC = 20:00 Israel)
 *     URL: https://lexiclash.live/api/cron/instagram-post?lang=he
 *   - Authorization: Bearer YOUR_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check (same pattern as other cron routes)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const expected = `Bearer ${cronSecret}`;

    if (
      !cronSecret ||
      !authHeader ||
      authHeader.length !== expected.length ||
      !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 6) {
      return NextResponse.json({ message: 'Saturday — no posts scheduled' });
    }

    const lang = request.nextUrl.searchParams.get('lang');
    // Per-lang lock — EN and HE legitimately run on different cron schedules.
    const lockKey = `instagram-post-${lang || 'all'}`;
    const lockTtl = lang ? 90_000 : 180_000;

    const locked = await withCronLock(lockKey, lockTtl, async () => {
      const siteUrl = process.env.SITE_URL || 'https://lexiclash.live';
      const results: { lang: string; status: string; mediaId?: string; error?: string }[] = [];

      // Post EN
      if (!lang || lang === 'en') {
        const post = EN_POSTS[dayOfWeek];
        const token = process.env.INSTAGRAM_ACCESS_TOKEN_EN;
        const accountId = process.env.INSTAGRAM_ACCOUNT_ID_EN;

        if (post && token && accountId) {
          try {
            const imageUrl = `${siteUrl}/images/promo/${post.image}`;
            const { mediaId } = await createAndPublish(accountId, token, imageUrl, post.caption, post.hashtags, 'EN');
            results.push({ lang: 'en', status: 'published', mediaId });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.error('[IG:EN] Failed:', msg);
            results.push({ lang: 'en', status: 'failed', error: msg });
          }
        } else {
          results.push({ lang: 'en', status: 'skipped', error: post ? 'Missing credentials' : 'No post for today' });
        }
      }

      // Post HE
      if (!lang || lang === 'he') {
        const post = HE_POSTS[dayOfWeek];
        const token = process.env.INSTAGRAM_ACCESS_TOKEN_HE;
        const accountId = process.env.INSTAGRAM_ACCOUNT_ID_HE;

        if (post && token && accountId) {
          try {
            const imageUrl = `${siteUrl}/images/promo/${post.image}`;
            const { mediaId } = await createAndPublish(accountId, token, imageUrl, post.caption, post.hashtags, 'HE');
            results.push({ lang: 'he', status: 'published', mediaId });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.error('[IG:HE] Failed:', msg);
            results.push({ lang: 'he', status: 'failed', error: msg });
          }
        } else {
          results.push({ lang: 'he', status: 'skipped', error: post ? 'Missing credentials' : 'No post for today' });
        }
      }

      return results;
    });

    if (locked.status === 'skipped') {
      logger.log(`[IG Cron] ${lockKey}: skipped (already running)`);
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ day: dayOfWeek, results: locked.result });
  } catch (error) {
    logger.error('[IG Cron] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
