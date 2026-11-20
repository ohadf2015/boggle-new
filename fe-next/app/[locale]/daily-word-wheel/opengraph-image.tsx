import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WHEEL_OG, wheelOgLocale } from './wheelOgCopy';

export const runtime = 'nodejs';
export const alt = 'Daily Word Wheel - LexiClash';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const NAVY = '#1a1a2e';
const NAVY_LIGHT = '#16213e';
const CREAM = '#fffef0';
const LIME = '#bfff00';
const PINK = '#ff1493';
const CYAN = '#00ffff';
const BLACK = '#000000';

const WHEEL = 430;
const RADIUS = 150;
const TILE = 92;
const HUB = 118;

const fileCache = new Map<string, Buffer | null>();
function publicFile(path: string): Buffer | null {
  if (!fileCache.has(path)) {
    try {
      fileCache.set(path, readFileSync(join(process.cwd(), 'public', path)));
    } catch {
      fileCache.set(path, null);
    }
  }
  return fileCache.get(path) ?? null;
}

// ponytail: Satori has no bidi, so Hebrew is reversed before layout; keep digits out of Hebrew copy.
const visual = (text: string, rtl: boolean) => (rtl ? [...text].reverse().join('') : text);

function tileCenter(i: number) {
  const rad = (i * 60 * Math.PI) / 180;
  return { x: WHEEL / 2 + Math.sin(rad) * RADIUS, y: WHEEL / 2 - Math.cos(rad) * RADIUS };
}

export default async function OGImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = wheelOgLocale(locale);
  const copy = WHEEL_OG[lang];
  const rtl = lang === 'he';

  const fontFile = lang === 'ja' ? 'fonts/pdf/NotoSansJP-Bold.ttf' : 'fonts/pdf/Rubik-Bold.ttf';
  const font = publicFile(fontFile);
  const mascot = publicFile('og/wheel-mascot.png');

  const spot = (letter: string) =>
    letter === copy.center ? { x: WHEEL / 2, y: WHEEL / 2 } : tileCenter(copy.outer.indexOf(letter));
  const trail = copy.word.map((l) => {
    const p = spot(l);
    return `${p.x},${p.y}`;
  }).join(' ');
  const inWord = new Set(copy.word);
  const titleSize = copy.title.length > 18 ? 64 : 80;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: rtl ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 64px',
          backgroundColor: NAVY,
          backgroundImage: 'radial-gradient(circle, rgba(255,254,240,0.09) 2px, transparent 2px)',
          backgroundSize: '34px 34px',
          fontFamily: 'Brand',
          color: CREAM,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: rtl ? 'flex-end' : 'flex-start',
            textAlign: rtl ? 'right' : 'left',
            width: 600,
          }}
        >
          <div
            style={{
              display: 'flex',
              background: LIME,
              color: BLACK,
              border: `4px solid ${BLACK}`,
              boxShadow: `5px 5px 0 ${BLACK}`,
              borderRadius: 10,
              padding: '6px 18px',
              fontSize: 26,
              textTransform: 'uppercase',
              letterSpacing: 2,
              transform: `rotate(${rtl ? 2 : -2}deg)`,
            }}
          >
            {visual(copy.kicker, rtl)}
          </div>
          <div style={{ display: 'flex', fontSize: titleSize, lineHeight: 1.02, marginTop: 28 }}>
            {visual(copy.title, rtl)}
          </div>
          <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.3, marginTop: 18, color: 'rgba(255,254,240,0.78)' }}>
            {visual(copy.line, rtl)}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: rtl ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 28,
              marginTop: 40,
            }}
          >
            <div
              style={{
                display: 'flex',
                background: PINK,
                color: CREAM,
                border: `4px solid ${BLACK}`,
                boxShadow: `6px 6px 0 ${BLACK}`,
                borderRadius: 14,
                padding: '14px 30px',
                fontSize: 32,
              }}
            >
              {visual(copy.cta, rtl)}
            </div>
            <div style={{ display: 'flex', fontSize: 34 }}>
              <span style={{ color: LIME }}>Lexi</span>
              <span style={{ color: CYAN }}>Clash</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', position: 'relative', width: WHEEL, height: WHEEL, [rtl ? 'marginLeft' : 'marginRight']: 36 }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: WHEEL,
              height: WHEEL,
              borderRadius: WHEEL / 2,
              background: NAVY_LIGHT,
              border: `6px solid ${BLACK}`,
              boxShadow: `12px 12px 0 ${BLACK}`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: 14,
              width: WHEEL - 28,
              height: WHEEL - 28,
              borderRadius: WHEEL / 2,
              border: `4px dashed rgba(191,255,0,0.45)`,
            }}
          />
          <svg
            width={WHEEL}
            height={WHEEL}
            viewBox={`0 0 ${WHEEL} ${WHEEL}`}
            style={{ position: 'absolute', left: 0, top: 0 }}
          >
            <polyline points={trail} fill="none" stroke={BLACK} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={trail} fill="none" stroke={PINK} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {copy.outer.map((letter, i) => {
            const { x, y } = tileCenter(i);
            const hit = inWord.has(letter);
            return (
              <div
                key={letter}
                style={{
                  position: 'absolute',
                  left: x - TILE / 2,
                  top: y - TILE / 2,
                  width: TILE,
                  height: TILE,
                  borderRadius: TILE / 2,
                  background: hit ? PINK : CREAM,
                  color: hit ? CREAM : NAVY,
                  border: `5px solid ${BLACK}`,
                  boxShadow: `5px 5px 0 ${BLACK}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 46,
                }}
              >
                {letter}
              </div>
            );
          })}
          <div
            style={{
              position: 'absolute',
              left: WHEEL / 2 - HUB / 2,
              top: WHEEL / 2 - HUB / 2,
              width: HUB,
              height: HUB,
              borderRadius: HUB / 2,
              background: LIME,
              color: BLACK,
              border: `6px solid ${BLACK}`,
              boxShadow: `6px 6px 0 ${BLACK}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 62,
            }}
          >
            {copy.center}
          </div>
          <div
            style={{
              position: 'absolute',
              top: -34,
              [rtl ? 'right' : 'left']: -40,
              display: 'flex',
              flexDirection: rtl ? 'row-reverse' : 'row',
              alignItems: 'center',
              background: CREAM,
              color: NAVY,
              border: `4px solid ${BLACK}`,
              boxShadow: `5px 5px 0 ${BLACK}`,
              borderRadius: 12,
              padding: '6px 16px',
              fontSize: 34,
              letterSpacing: lang === 'ja' ? 0 : 4,
              transform: `rotate(${rtl ? 6 : -6}deg)`,
            }}
          >
            {visual(copy.word.join(''), rtl)}
            <svg width={30} height={30} viewBox="0 0 24 24" style={{ margin: rtl ? '0 10px 0 0' : '0 0 0 10px' }}>
              <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={PINK} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {mascot && (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img
              src={`data:image/png;base64,${mascot.toString('base64')}`}
              width={170}
              height={176}
              style={{ position: 'absolute', bottom: rtl ? -74 : -48, [rtl ? 'left' : 'right']: -56, transform: `rotate(${rtl ? -8 : 8}deg)` }}
            />
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: 'Brand', data: font, weight: 700, style: 'normal' }] : undefined,
    },
  );
}
