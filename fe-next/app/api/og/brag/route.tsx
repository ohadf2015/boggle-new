import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { deriveBragOgModel } from '@/lib/results/bragOgModel';

export const runtime = 'edge';

/**
 * Brag card OG image — the artifact a player shares after a multiplayer round.
 *
 * Replaces a text-only share string. Production 90d showed the old artifact
 * reaching 848 people and being acted on by 4; an unfurled image is the whole
 * point of pasting a link into a chat, and it carries the brand instead of
 * asking a recipient to parse "Score: 142 | Words: 11".
 *
 * NO EMOJI anywhere, by product decision: emoji render inconsistently across
 * platforms, break RTL runs, and read as a Wordle knockoff next to this app's
 * Neo-Brutalist identity. The two score bars carry the drama instead — scaled
 * against the higher score, so a close round LOOKS close and a blowout looks
 * like one.
 *
 * House style copied from `app/api/og/room/route.tsx`: navy ground, cream card,
 * 4px black borders, hard un-blurred shadows, no gradients.
 *
 * All params are untrusted (a player can hand-edit the URL) and are sanitised in
 * `deriveBragOgModel`, never rendered raw.
 */

const NAVY = '#1a1a2e';
const CREAM = '#FFFDF0';
const INK = '#1a1a2e';
const LIME = '#BFFF00';
const PINK = '#FF1493';
const CYAN = '#00FFFF';
const BLACK = '#000000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const m = deriveBragOgModel(searchParams);

  const headline =
    m.outcome === 'won'
      ? 'VICTORY'
      : m.outcome === 'lost'
        ? 'SO CLOSE'
        : m.outcome === 'tie'
          ? 'DEAD HEAT'
          : 'FINAL SCORE';

  const accent = m.outcome === 'won' ? LIME : m.outcome === 'lost' ? PINK : CYAN;
  const isVersus = m.rivalScore != null;

  const statBits: string[] = [];
  if (m.words != null) statBits.push(`${m.words} WORDS`);
  if (m.bestWord) statBits.push(`BEST: ${m.bestWord}`);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: NAVY,
          fontFamily: 'sans-serif',
          padding: 40,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: CREAM,
            border: `5px solid ${BLACK}`,
            borderRadius: 10,
            boxShadow: `12px 12px 0px ${BLACK}`,
            padding: '30px 44px 26px',
            justifyContent: 'flex-start',
          }}
        >
          {/* Eyebrow: brand left, mode chip right */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 30,
                fontWeight: 900,
                color: INK,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
              }}
            >
              LexiClash
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                fontWeight: 900,
                color: INK,
                backgroundColor: accent,
                border: `3px solid ${BLACK}`,
                borderRadius: 6,
                padding: '6px 16px',
                letterSpacing: '0.08em',
              }}
            >
              {m.modeLabel}
            </div>
          </div>

          {/* The verdict, then your number. The rival's score lives on its own
              bar below, so it is not printed three times. */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 18 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 66,
                fontWeight: 900,
                color: INK,
                letterSpacing: '-0.035em',
                lineHeight: 1,
              }}
            >
              {headline}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 116,
                fontWeight: 900,
                color: INK,
                lineHeight: 1,
                letterSpacing: '-0.05em',
                marginTop: 2,
              }}
            >
              {m.score}
            </div>
          </div>

          {/* Two bars scaled to the higher score — the margin, drawn. */}
          {isVersus ? (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 26 }}>
              <ScoreBar
                label="YOU"
                value={m.score}
                pct={m.youPct}
                color={LIME}
                emphasised={m.outcome === 'won'}
              />
              <div style={{ display: 'flex', height: 14 }} />
              <ScoreBar
                label={m.rivalName ?? 'RIVAL'}
                value={m.rivalScore ?? 0}
                pct={m.rivalPct}
                color={PINK}
                emphasised={m.outcome === 'lost'}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 26 }}>
              <ScoreBar label="YOU" value={m.score} pct={100} color={LIME} emphasised />
            </div>
          )}

          {/* Footer: stats left, the dare right. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: `3px solid ${BLACK}`,
              paddingTop: 16,
              marginTop: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                fontWeight: 700,
                color: '#4a5068',
                letterSpacing: '0.06em',
              }}
            >
              {statBits.join('   ·   ')}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 24,
                fontWeight: 900,
                color: INK,
                letterSpacing: '-0.01em',
              }}
            >
              lexiclash.live
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function ScoreBar({
  label,
  value,
  pct,
  color,
  emphasised,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
  emphasised: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          display: 'flex',
          width: 168,
          fontSize: 25,
          fontWeight: 900,
          color: INK,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          flex: 1,
          height: emphasised ? 46 : 38,
          border: `4px solid ${BLACK}`,
          borderRadius: 6,
          backgroundColor: '#EFEADA',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: `${pct}%`,
            height: '100%',
            backgroundColor: color,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          width: 132,
          justifyContent: 'flex-end',
          fontSize: emphasised ? 38 : 32,
          fontWeight: 900,
          color: INK,
          letterSpacing: '-0.03em',
        }}
      >
        {value}
      </div>
    </div>
  );
}
