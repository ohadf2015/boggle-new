/**
 * Public Android release announcement — "LexiClash is now on Google Play".
 *
 * Fresh neo-brutalist layout (NOT derived from the beta/game-mode templates):
 * hard pixel shadows, solid black borders, electric lime/cyan/pink accents,
 * one big kawaii hero, one CTA, almost no body text. Built table-first with
 * inline styles for email-client safety (no flexbox/grid, no media-query reliance
 * beyond a small mobile shrink).
 *
 * Sent as a REAL email (no [TEST] prefix) — see lib/androidReleaseLaunchEmail.ts.
 */

import {
  Html,
  Head,
  Preview,
  Body,
  Img,
  Font,
  Tailwind,
  pixelBasedPreset,
} from '@react-email/components';
import { getReleaseStrings } from './androidReleaseLaunch.strings';

export interface AndroidReleaseLaunchEmailProps {
  recipientName: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
}

// Production-hosted asset. NOTE: lives in fe-next/public/email-assets/, served at
// this absolute URL only AFTER a deploy lands. A bulk send must run post-deploy or
// recipients get a broken image (inline data-URIs are blocked by Gmail).
export const HERO_IMAGE =
  'https://www.lexiclash.live/email-assets/android-release-hero.jpg';

// Neo-brutalist palette (mirrors .claude/docs/design-system.md).
const C = {
  bg: '#1a1a2e',
  card: '#16213e',
  lime: '#BFFF00',
  cyan: '#00FFFF',
  pink: '#FF1493',
  purple: '#8B5CF6',
  black: '#000000',
  white: '#FFFFFF',
  cream: '#FFFEF0',
  muted: '#94A3B8',
};

const FONT_STACK =
  "'Fredoka','Rubik','Segoe UI',Helvetica,Arial,sans-serif";

export function getAndroidReleaseLaunchSubject(
  language: string,
  recipientName: string
): string {
  return getReleaseStrings(language).subject(recipientName);
}

export default function AndroidReleaseLaunchEmail({
  recipientName,
  language,
  unsubscribeUrl,
  playUrl,
}: AndroidReleaseLaunchEmailProps) {
  const t = getReleaseStrings(language);
  const rtl = language === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  // Hard shadows flip horizontally in RTL so the "light source" stays consistent.
  const sh = rtl ? '-' : '';

  const chipColors = [C.lime, C.cyan, C.pink];

  return (
    <Html lang={language} dir={dir}>
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head>
          <Font
            fontFamily="Fredoka"
            fallbackFontFamily="Arial"
            webFont={{
              url: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap',
              format: 'woff2',
            }}
          />
          <Font
            fontFamily="Rubik"
            fallbackFontFamily="Helvetica"
            webFont={{
              url: 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap',
              format: 'woff2',
            }}
          />
          <meta name="color-scheme" content="dark" />
          <meta name="supported-color-schemes" content="dark" />
          <style>{`
            u + .body { background-color: ${C.bg} !important; }
            @media (max-width: 480px) {
              .h1 { font-size: 28px !important; }
              .chip { display: block !important; width: 100% !important; padding: 8px 0 !important; }
              .card-pad { padding: 24px 20px !important; }
            }
          `}</style>
        </Head>

        <Preview>{t.preview}</Preview>

        <Body
          className="body"
          style={{ margin: 0, padding: 0, backgroundColor: C.bg, fontFamily: FONT_STACK }}
        >
          <table
            role="presentation"
            cellPadding={0}
            cellSpacing={0}
            width="100%"
            dir={dir}
            style={{ backgroundColor: C.bg }}
          >
            <tr>
              <td align="center" style={{ padding: '32px 20px' }}>
                <table
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                  width="100%"
                  dir={dir}
                  style={{ maxWidth: '600px' }}
                >
                  {/* Wordmark */}
                  <tr>
                    <td
                      align="center"
                      style={{
                        paddingBottom: '20px',
                        fontFamily: FONT_STACK,
                        fontSize: '24px',
                        fontWeight: 700,
                        letterSpacing: '1px',
                        color: C.lime,
                      }}
                    >
                      LEXICLASH
                    </td>
                  </tr>

                  {/* Main card */}
                  <tr>
                    <td>
                      <table
                        role="presentation"
                        cellPadding={0}
                        cellSpacing={0}
                        width="100%"
                        dir={dir}
                        style={{
                          backgroundColor: C.card,
                          borderRadius: '24px',
                          border: `4px solid ${C.black}`,
                          boxShadow: `${sh}8px 8px 0px ${C.black}`,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Rainbow accent strip */}
                        <tr>
                          <td style={{ padding: 0, fontSize: 0, lineHeight: 0 }}>
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td width="25%" height="8" style={{ backgroundColor: C.lime }} />
                                <td width="25%" height="8" style={{ backgroundColor: C.cyan }} />
                                <td width="25%" height="8" style={{ backgroundColor: C.pink }} />
                                <td width="25%" height="8" style={{ backgroundColor: C.purple }} />
                              </tr>
                            </table>
                          </td>
                        </tr>

                        {/* Hero image */}
                        <tr>
                          <td style={{ padding: 0, fontSize: 0, lineHeight: 0 }}>
                            <Img
                              src={HERO_IMAGE}
                              alt="LexiClash is on Android"
                              width="600"
                              style={{
                                display: 'block',
                                width: '100%',
                                maxWidth: '600px',
                                height: 'auto',
                                border: 0,
                                outline: 'none',
                              }}
                            />
                          </td>
                        </tr>

                        {/* Card body */}
                        <tr>
                          <td className="card-pad" style={{ padding: '32px 36px 36px' }} align="center">
                            {/* Badge */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 auto 18px' }}>
                              <tr>
                                <td
                                  style={{
                                    backgroundColor: C.lime,
                                    color: C.black,
                                    border: `3px solid ${C.black}`,
                                    borderRadius: '9999px',
                                    boxShadow: `${sh}3px 3px 0px ${C.black}`,
                                    padding: '6px 16px',
                                    fontFamily: FONT_STACK,
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    letterSpacing: '1px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {t.badge}
                                </td>
                              </tr>
                            </table>

                            {/* Headline */}
                            <h1
                              className="h1"
                              style={{
                                margin: '0 0 10px',
                                fontFamily: FONT_STACK,
                                fontSize: '36px',
                                lineHeight: 1.1,
                                fontWeight: 700,
                                color: C.white,
                              }}
                            >
                              {t.headline}
                            </h1>

                            {/* Subhead */}
                            <p
                              style={{
                                margin: '0 0 24px',
                                fontFamily: FONT_STACK,
                                fontSize: '16px',
                                lineHeight: 1.5,
                                color: C.muted,
                              }}
                            >
                              {t.subhead}
                            </p>

                            {/* Feature chips */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ marginBottom: '28px' }}>
                              <tr>
                                {t.chips.map((chip, i) => (
                                  <td
                                    key={chip}
                                    className="chip"
                                    align="center"
                                    style={{
                                      padding: i === 1 ? '0 8px' : 0,
                                      verticalAlign: 'top',
                                    }}
                                  >
                                    <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                                      <tr>
                                        <td
                                          align="center"
                                          style={{
                                            border: `2px solid ${chipColors[i]}`,
                                            borderRadius: '12px',
                                            padding: '10px 6px',
                                            fontFamily: FONT_STACK,
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: chipColors[i],
                                          }}
                                        >
                                          {chip}
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                ))}
                              </tr>
                            </table>

                            {/* CTA */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 auto' }}>
                              <tr>
                                <td
                                  style={{
                                    backgroundColor: C.lime,
                                    borderRadius: '14px',
                                    border: `3px solid ${C.black}`,
                                    boxShadow: `${sh}6px 6px 0px ${C.black}`,
                                  }}
                                >
                                  <a
                                    href={playUrl}
                                    className="cta-btn"
                                    style={{
                                      display: 'block',
                                      padding: '16px 36px',
                                      fontFamily: FONT_STACK,
                                      fontSize: '18px',
                                      fontWeight: 700,
                                      color: C.black,
                                      textDecoration: 'none',
                                    }}
                                  >
                                    {t.cta} ▶
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* Footer */}
                  <tr>
                    <td align="center" style={{ padding: '24px 16px 8px' }}>
                      {/* recipientName is escaped at substitution time by the lib */}
                      <p style={{ margin: '0 0 6px', fontFamily: FONT_STACK, fontSize: '13px', color: C.muted }}>
                        {recipientName ? `${recipientName} — ` : ''}
                        {t.footer}
                      </p>
                      <a
                        href={unsubscribeUrl}
                        style={{ fontFamily: FONT_STACK, fontSize: '12px', color: C.muted, textDecoration: 'underline' }}
                      >
                        {t.unsubscribe}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </Body>
      </Tailwind>
    </Html>
  );
}

AndroidReleaseLaunchEmail.PreviewProps = {
  recipientName: 'Word Hunter',
  language: 'en',
  unsubscribeUrl: 'https://lexiclash.live/api/email/unsubscribe?token=test123',
  playUrl: 'https://play.google.com/store/apps/details?id=live.lexiclash.app',
} satisfies AndroidReleaseLaunchEmailProps;

export { AndroidReleaseLaunchEmail };
