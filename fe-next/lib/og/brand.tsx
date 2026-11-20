import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';

export const OG_SIZE = { width: 1200, height: 630 };
export const ART = 430;

export const C = {
  navy: '#1a1a2e',
  navyLight: '#16213e',
  cream: '#fffef0',
  lime: '#bfff00',
  pink: '#ff1493',
  cyan: '#00ffff',
  black: '#000000',
};

export type OgLang = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';
const LANGS: OgLang[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
export const ogLang = (locale: string): OgLang => (LANGS.includes(locale as OgLang) ? (locale as OgLang) : 'en');

const fileCache = new Map<string, Buffer | null>();
export function publicFile(path: string): Buffer | null {
  if (!fileCache.has(path)) {
    try {
      fileCache.set(path, readFileSync(join(process.cwd(), 'public', path)));
    } catch {
      fileCache.set(path, null);
    }
  }
  return fileCache.get(path) ?? null;
}

// ponytail: Satori has no bidi, so Hebrew is reversed before layout; Latin and digits go in their own elements.
export const visual = (text: string, lang: OgLang) => (lang === 'he' ? [...text].reverse().join('') : text);

/** RTL text that wraps right-to-left: each word is laid out as its own reversed item in a row-reverse wrap. */
export function Txt({ text, lang, size, style }: { text: string; lang: OgLang; size: number; style?: Record<string, unknown> }) {
  if (lang !== 'he') return <div style={{ display: 'flex', fontSize: size, ...style }}>{text}</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', fontSize: size, columnGap: Math.round(size * 0.28), ...style }}>
      {text.split(' ').map((w, i) => (
        <span key={i}>{visual(w, lang)}</span>
      ))}
    </div>
  );
}

function titleSize(title: string, lang: OgLang) {
  if (lang === 'ja') return Math.min(80, Math.floor(600 / Math.ceil(title.length / 2)));
  return title.length > 22 ? 58 : title.length > 16 ? 68 : 80;
}

export function hardBox(bg: string, shadow = 5) {
  return { background: bg, border: `4px solid ${C.black}`, boxShadow: `${shadow}px ${shadow}px 0 ${C.black}` };
}

export function WordSticker({ word, lang, style }: { word: string; lang: OgLang; style?: Record<string, unknown> }) {
  const rtl = lang === 'he';
  return (
    <div
      style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: rtl ? 'row-reverse' : 'row',
        alignItems: 'center',
        ...hardBox(C.cream),
        color: C.navy,
        borderRadius: 12,
        padding: '6px 16px',
        fontSize: 34,
        letterSpacing: lang === 'ja' ? 0 : 4,
        transform: `rotate(${rtl ? 6 : -6}deg)`,
        ...style,
      }}
    >
      {visual(word, lang)}
      <svg width={30} height={30} viewBox="0 0 24 24" style={{ margin: rtl ? '0 10px 0 0' : '0 0 0 10px' }}>
        <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={C.pink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export interface CardCopy {
  kicker: string;
  title: string;
  line: string;
  cta: string;
}

function Wordmark({ size }: { size: number }) {
  return (
    <div style={{ display: 'flex', fontSize: size, lineHeight: 1 }}>
      <span style={{ color: C.lime }}>Lexi</span>
      <span style={{ color: C.cyan }}>Clash</span>
    </div>
  );
}

export function renderLandingCard(lang: OgLang, copy: CardCopy, art: ReactNode, opts: { brandTitle?: boolean } = {}) {
  const rtl = lang === 'he';
  const font = publicFile(lang === 'ja' ? 'fonts/pdf/NotoSansJP-Bold.ttf' : 'fonts/pdf/Rubik-Bold.ttf');
  const mascot = publicFile('og/wheel-mascot.png');

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
          backgroundColor: C.navy,
          backgroundImage: 'radial-gradient(circle, rgba(255,254,240,0.09) 2px, transparent 2px)',
          backgroundSize: '34px 34px',
          fontFamily: 'Brand',
          color: C.cream,
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
              ...hardBox(C.lime),
              color: C.black,
              borderRadius: 10,
              padding: '6px 18px',
              fontSize: 26,
              textTransform: 'uppercase',
              letterSpacing: lang === 'ja' ? 0 : 2,
              transform: `rotate(${rtl ? 2 : -2}deg)`,
            }}
          >
            {visual(copy.kicker, lang)}
          </div>
          <div style={{ display: 'flex', marginTop: 28 }}>
            {opts.brandTitle ? (
              <Wordmark size={104} />
            ) : (
              <Txt text={copy.title} lang={lang} size={titleSize(copy.title, lang)} style={{ lineHeight: 1.04 }} />
            )}
          </div>
          <Txt
            text={copy.line}
            lang={lang}
            size={lang === 'ja' ? 26 : 30}
            style={{ lineHeight: 1.3, marginTop: 18, color: 'rgba(255,254,240,0.8)' }}
          />
          <div style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 28, marginTop: 40 }}>
            <div style={{ display: 'flex', ...hardBox(C.pink, 6), color: C.cream, borderRadius: 14, padding: '14px 30px', fontSize: 32 }}>
              {visual(copy.cta, lang)}
            </div>
            {!opts.brandTitle && <Wordmark size={34} />}
          </div>
        </div>

        <div style={{ display: 'flex', position: 'relative', width: ART, height: ART, [rtl ? 'marginLeft' : 'marginRight']: 36 }}>
          {art}
          {mascot && (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              src={`data:image/png;base64,${mascot.toString('base64')}`}
              width={170}
              height={176}
              style={{
                position: 'absolute',
                bottom: rtl ? -74 : -48,
                [rtl ? 'left' : 'right']: -56,
                transform: `rotate(${rtl ? -8 : 8}deg)`,
              }}
            />
          )}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: font ? [{ name: 'Brand', data: font, weight: 700, style: 'normal' }] : undefined },
  );
}
