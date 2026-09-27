import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STREAK_HEAT, getStreakHeat, type StreakHeat } from '@/lib/streakHeat';
import type { StreakTierConfig } from '@/lib/streakTierRewards';

/**
 * Streak share card — the image a player sends when they show off a streak.
 *
 * Composed to match `StreakHeatCard` on screen (tier gradient, tier mascot,
 * giant count) so the shared picture is recognisably the thing they were just
 * looking at.
 *
 * Runs on the Node runtime, not edge: the mascot is inlined from disk as a data
 * URI. Satori cannot rasterize the animated WebP the app uses, and pointing it
 * at a remote URL would make every crawl depend on a second network hop that
 * can fail silently and yield a mascot-less card.
 */
export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;

function isTierId(value: string | null): value is StreakTierConfig['id'] {
  return !!value && value in STREAK_HEAT;
}

/** Cached across requests in a warm lambda — these files never change. */
const mascotCache = new Map<string, string | null>();

function mascotDataUri(tierId: StreakTierConfig['id']): string | null {
  if (mascotCache.has(tierId)) return mascotCache.get(tierId) ?? null;
  let uri: string | null = null;
  try {
    const file = join(process.cwd(), 'public', 'og', `streak-${tierId}.png`);
    uri = `data:image/png;base64,${readFileSync(file).toString('base64')}`;
  } catch {
    // Missing export — render the card without the mascot rather than 500.
    uri = null;
  }
  mascotCache.set(tierId, uri);
  return uri;
}

function card(streak: number, heat: StreakHeat, mascot: string | null) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '64px',
        background: `linear-gradient(160deg, ${heat.from} 0%, ${heat.to} 100%)`,
        fontFamily: 'sans-serif',
      }}
    >
      {mascot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mascot} width={360} height={360} alt="" />
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div
          style={{
            display: 'flex',
            fontSize: '200px',
            fontWeight: 900,
            color: heat.ink,
            lineHeight: 1,
            textShadow: `6px 6px 0px rgba(0,0,0,0.35)`,
          }}
        >
          {streak}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: '56px',
            fontWeight: 900,
            color: heat.ink,
            textTransform: 'uppercase',
            letterSpacing: '4px',
            marginTop: '8px',
          }}
        >
          day streak
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: '32px',
            padding: '12px 28px',
            borderRadius: '999px',
            background: heat.ring,
            color: '#101828',
            fontSize: '32px',
            fontWeight: 900,
            letterSpacing: '2px',
          }}
        >
          LEXICLASH.LIVE
        </div>
      </div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const rawStreak = Number(searchParams.get('streak'));
  const streak = Number.isFinite(rawStreak) ? Math.max(0, Math.trunc(rawStreak)) : 0;

  const tierParam = searchParams.get('tier');
  // An explicit tier wins (it is what the player actually saw), but a bad or
  // absent one is derived from the streak rather than failing the request.
  const heat = isTierId(tierParam) ? STREAK_HEAT[tierParam] : getStreakHeat(streak);

  return new ImageResponse(card(streak, heat, mascotDataUri(heat.id)), {
    width: WIDTH,
    height: HEIGHT,
    headers: {
      'Cache-Control': 'public, immutable, no-transform, max-age=31536000',
    },
  });
}
