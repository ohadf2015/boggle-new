/**
 * Welcome Email — LexiClash
 *
 * Sent to brand-new signups. Title is literally "Hi {name}".
 * Warm, witty, light on text. Introduces the flagship game modes,
 * a generated neo-brutalist hero image, and a "watch the tour" video card
 * (email clients can't embed <video> — so it's a poster + play badge that
 * links out to the hosted clip).
 *
 * Neo-brutalist house style matching gameModeAnnouncement.tsx:
 * clipped-circle mascot, hero image, color-coded mode grid, single CTA,
 * RTL-aware (Hebrew), Gmail/Outlook dark-mode safe.
 *
 * PREVIEW ONLY for now — not wired into the signup flow. Run:
 *   npm run email   →   http://localhost:3030  →  "welcome"
 */

import {
  Html,
  Head,
  Preview,
  Body,
  Heading,
  Text,
  Button,
  Link,
  Img,
  Font,
  Tailwind,
  pixelBasedPreset,
} from '@react-email/components';
import { getWelcomeEmailModes, type WelcomeEmailMode } from '@/lib/email/welcomeModes';
import { playStoreUrlWithReferrer } from '@/utils/androidApp';
import { ModeGrid } from './components/ModeGrid';

/* ───────────────────────── Types ───────────────────────── */

export interface WelcomeEmailProps {
  recipientName: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string; // where the CTA goes
  videoUrl: string; // hosted tour clip (YouTube / mux / etc.)
  baseUrl?: string; // asset origin; defaults to production
  /**
   * Google Play listing for the native Android app. Defaults to the shared
   * Play Store URL carrying a `welcome_email` install referrer (so installs
   * sourced from this email are attributable in Play Console). Pass a value
   * to override (e.g. a different campaign tag).
   */
  androidUrl?: string;
  /**
   * Localized, link-ready public modes — computed server-side from the shared
   * MODE_META registry (see lib/email/welcomeModes). Keeps the email in sync
   * with the landing cubes; the cube art carries the colour, so the tiles
   * themselves use one uniform chrome (no per-mode rainbow of borders).
   */
  modes: WelcomeEmailMode[];
}

interface WelcomeCopy {
  heading: (name: string) => string; // "Hi {name} 👋"
  intro: string;
  videoLabel: string;
  videoSub: string;
  modesHeader: string;
  cta: string;
  ps: string;
  androidLabel: string; // "Prefer an app? Play on Android."
  androidCta: string; // "Get it on Google Play"
  footerReason: string;
  unsubscribe: string;
  privacy: string;
}

/* ───────────────────────── Copy — per language ───────────────────────── */

const COPY: Record<string, WelcomeCopy> = {
  en: {
    heading: (n) => `Hi ${n} 👋`,
    intro: "You're in. Pick a mode, pick a fight.",
    videoLabel: 'See it in action',
    videoSub: "↑ yep, that's the game",
    modesHeader: 'PICK YOUR FIGHT',
    cta: 'Play now',
    ps: "Fair warning: it's addictive.",
    androidLabel: 'On the go? LexiClash lives on your phone too.',
    androidCta: 'Get it on Google Play',
    footerReason: 'You just joined LexiClash.',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
  },
  he: {
    heading: (n) => `היי ${n} 👋`,
    intro: 'יאללה, את/ה בפנים. בחר/י מצב, בחר/י קרב.',
    videoLabel: 'ככה זה נראה',
    videoSub: '↑ זה המשחק עצמו',
    modesHeader: 'בחרו את הקרב',
    cta: 'יאללה, משחקים',
    ps: 'אזהרה: זה ממכר.',
    androidLabel: 'בדרכים? LexiClash גם בנייד שלך.',
    androidCta: 'הורידו מ-Google Play',
    footerReason: 'הרגע הצטרפת ל-LexiClash.',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
  },
  sv: {
    heading: (n) => `Hej ${n} 👋`,
    intro: 'Du är med. Välj ett läge och kör.',
    videoLabel: 'Se det i rörelse',
    videoSub: '↑ så ser spelet ut',
    modesHeader: 'VÄLJ DIN MATCH',
    cta: 'Spela nu',
    ps: 'Varning: beroendeframkallande.',
    androidLabel: 'På språng? LexiClash finns i fickan också.',
    androidCta: 'Hämta på Google Play',
    footerReason: 'Du gick precis med i LexiClash.',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
  },
  ja: {
    heading: (n) => `${n}さん、こんにちは 👋`,
    intro: 'ようこそ。モードを選んで、さあ一戦。',
    videoLabel: '実際のプレイ',
    videoSub: '↑ これが本物',
    modesHeader: '勝負を選べ',
    cta: '今すぐ遊ぶ',
    ps: '注意：ハマります。',
    androidLabel: '外出中でも？ LexiClashはスマホでも遊べます。',
    androidCta: 'Google Playで入手',
    footerReason: 'LexiClashに登録しました。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
  },
  es: {
    heading: (n) => `Hola ${n} 👋`,
    intro: 'Ya estás dentro. Elige modo y a jugar.',
    videoLabel: 'Míralo en acción',
    videoSub: '↑ así se juega',
    modesHeader: 'ELIGE TU BATALLA',
    cta: 'Jugar ya',
    ps: 'Aviso: engancha.',
    androidLabel: '¿En movimiento? LexiClash también vive en tu móvil.',
    androidCta: 'Descárgalo en Google Play',
    footerReason: 'Acabas de unirte a LexiClash.',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
  },
  ru: {
    heading: (n) => `Привет, ${n} 👋`,
    intro: 'Добро пожаловать. Выбирай режим, начинай игру.',
    videoLabel: 'Смотри в действии',
    videoSub: '↑ вот так это работает',
    modesHeader: 'ВЫБЕРИ БОЕВОЙ РЕЖИМ',
    cta: 'Начинаем',
    ps: 'Внимание: затягивает.',
    androidLabel: 'На ходу? LexiClash и в мобильном приложении.',
    androidCta: 'Скачай с Google Play',
    footerReason: 'Ты только что присоединился к LexiClash.',
    unsubscribe: 'Отписаться',
    privacy: 'Приватность',
  },
};

/* ───────────────────────── Subject lines ───────────────────────── */

const SUBJECTS: Record<string, (name: string) => string> = {
  en: (n) => `Hi ${n}, glad you're here`,
  he: (n) => `היי ${n}, כיף שהצטרפת`,
  sv: (n) => `Hej ${n}, kul att du hittade hit`,
  ja: (n) => `${n}さん、来てくれてうれしいです`,
  es: (n) => `Hola ${n}, qué bueno tenerte por aquí`,
  ru: (n) => `Привет, ${n}! Рады видеть тебя`,
};

export function getWelcomeSubject(language: string, recipientName: string): string {
  const fn = SUBJECTS[language] || SUBJECTS.en;
  return fn(recipientName);
}

/* ───────────────────────── Palette ───────────────────────── */

const C = {
  bg: '#1a1a2e',
  card: '#252545',
  cardInner: '#1e1e3a',
  // Off-black, NOT pure #000000: Gmail (Android) dark mode force-swaps pure
  // #000000 → #FFFFFF, which flipped the lime CTA's text + border + hard-shadow
  // white (illegible on lime). An off-black reads identically but is left alone.
  border: '#0A0A0A',
  footer: '#666666',
  lime: '#A8E600',
  pink: '#FF1493',
  cyan: '#5CE0D6',
  purple: '#8B5CF6',
  white: '#FFFFFF',
  black: '#0A0A0A',
  grayDark: '#374151',
  grayLight: '#9CA3AF',
  // Uniform tile chrome — one quiet edge for every mode. The cube art carries
  // all the colour, so the grid reads calm instead of a rainbow of borders.
  // tileBg MUST equal the cube image's baked navy so the art bleeds seamlessly.
  tileBg: '#1a1a2e',
  tileBorder: '#3a3a5e',
} as const;

const DEFAULT_BASE = 'https://www.lexiclash.live';

/* ───────────────────────── Component ───────────────────────── */

export default function WelcomeEmail({
  recipientName,
  language,
  unsubscribeUrl,
  playUrl,
  videoUrl,
  baseUrl = DEFAULT_BASE,
  androidUrl,
  modes,
}: WelcomeEmailProps) {
  const t = COPY[language] || COPY.en;

  const rtl = language === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const sh = rtl ? '-' : ''; // hard-shadow direction flips in RTL
  const locale = ['he', 'sv', 'ja', 'es', 'ru'].includes(language) ? language : 'en';
  const privacyUrl = `${baseUrl}/${locale}/privacy`;
  // Native Android app — defaults to the Play Store listing tagged with a
  // `welcome_email` install referrer (+ per-locale utm_content) so installs
  // from this email are attributable in Play Console.
  const androidPlayUrl = androidUrl || playStoreUrlWithReferrer('welcome_email', locale);
  // Neo "play" glyph for the Google Play button (shared with the release email).
  const playIconUrl = baseUrl
    ? `${baseUrl}/email-assets/android-release-play-icon.png`
    : '/static/android-release-play-icon.png';
  // Animated GIF — the only thing that actually plays inside an inbox.
  // Outlook desktop shows frame 1 only (it's the hero mosaic, so it reads fine).
  const videoGifUrl = baseUrl
    ? `${baseUrl}/email/welcome-video.gif`
    : '/static/welcome-video.gif';
  const logoLang = rtl ? 'he' : 'en';
  const logoUrl = baseUrl
    ? `${baseUrl}/email-assets/email-logo-${logoLang}.png`
    : `/static/email-logo-${logoLang}.png`;
  const year = new Date().getFullYear();


  return (
    <Html lang={language} dir={dir}>
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head>
          <Font
            fontFamily="Fredoka"
            fallbackFontFamily="Arial"
            webFont={{
              url: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap',
              format: 'woff2',
            }}
          />
          <meta name="color-scheme" content="dark" />
          <meta name="supported-color-schemes" content="dark" />
          <style>{`
            u + .body { background-color: ${C.bg} !important; }
            [data-ogsc] h1 { color: ${C.white} !important; }
            [data-ogsc] .cta-btn { background-color: ${C.lime} !important; color: ${C.black} !important; }
            @media (max-width: 480px) {
              .hero-img { width: 100% !important; height: auto !important; }
              .mascot-badge { width: 120px !important; height: 120px !important; }
              .mascot-img { width: 112px !important; height: 112px !important; }
              .h1 { font-size: 26px !important; }
              .mode-td { display: block !important; width: 100% !important; padding: 0 0 12px 0 !important; }
            }
          `}</style>
        </Head>

        <Preview>{t.intro}</Preview>

        <Body
          className="body"
          style={{
            margin: 0,
            padding: 0,
            backgroundColor: C.bg,
            fontFamily:
              "'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          }}
        >
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" dir={dir}
            style={{ backgroundColor: C.bg }}>
            <tr>
              <td align="center" style={{ padding: '32px 20px' }}>
                <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                  style={{ maxWidth: '560px' }} dir={dir}>

                  {/* ── Logo ── */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '18px' }}>
                      <Link href={playUrl} target="_blank" style={{ textDecoration: 'none' }}>
                        <Img
                          src={logoUrl}
                          alt="LexiClash"
                          width="150"
                          height="112"
                          style={{
                            display: 'block',
                            width: '150px',
                            height: 'auto',
                            border: 0,
                            outline: 'none',
                          }}
                        />
                      </Link>
                    </td>
                  </tr>

                  {/* ── Main card ── */}
                  <tr>
                    <td>
                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" dir={dir}
                        style={{
                          backgroundColor: C.card,
                          borderRadius: '20px',
                          border: `4px solid ${C.black}`,
                          boxShadow: `${sh}8px 8px 0px ${C.black}`,
                          overflow: 'hidden',
                        }}>

                        {/* Single brand accent strip (one colour, not a gradient) */}
                        <tr>
                          <td style={{
                            backgroundColor: C.lime,
                            height: '6px', fontSize: 0, lineHeight: 0,
                          }}>&nbsp;</td>
                        </tr>

                        <tr>
                          <td style={{ padding: '24px 24px 28px' }}>

                            {/* ── "Hi {name}" heading (top of card — no separate hero;
                                 the animated GIF below is the single visual) ── */}
                            <Heading
                              as="h1"
                              className="h1"
                              style={{
                                color: C.white,
                                fontSize: '32px',
                                margin: '0 0 10px',
                                fontWeight: 700,
                                textAlign: 'center',
                                lineHeight: '1.2',
                                direction: dir,
                              }}
                            >
                              {t.heading(recipientName)}
                            </Heading>

                            {/* ── Intro ── */}
                            <Text style={{
                              color: C.white,
                              fontSize: '16px',
                              margin: '0 0 22px',
                              textAlign: 'center',
                              lineHeight: '1.55',
                              direction: dir,
                              fontWeight: 500,
                            }}>
                              {t.intro}
                            </Text>

                            {/* ── Animated GIF: plays inline in most clients (Gmail/Apple/iOS).
                                 Email clients can't embed <video>, so a looping GIF is the real
                                 in-inbox motion. Clickable through to the live game. ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                              style={{ marginBottom: '24px' }}>
                              <tr>
                                <td align="center">
                                  <Link href={videoUrl} target="_blank" style={{ textDecoration: 'none' }}>
                                    <Img
                                      src={videoGifUrl}
                                      alt={t.videoLabel}
                                      width="486"
                                      className="hero-img"
                                      style={{
                                        display: 'block',
                                        width: '100%',
                                        maxWidth: '486px',
                                        height: 'auto',
                                        borderRadius: '12px',
                                        border: `3px solid ${C.cyan}`,
                                        boxShadow: `${sh}5px 5px 0px ${C.black}`,
                                        outline: 'none',
                                      }}
                                    />
                                  </Link>
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style={{ paddingTop: '10px', direction: dir }}>
                                  <Link href={videoUrl} target="_blank" style={{ textDecoration: 'none' }}>
                                    <span style={{ color: C.white, fontSize: '15px', fontWeight: 700 }}>
                                      {t.videoLabel}
                                    </span>
                                  </Link>
                                  <div style={{ color: C.grayLight, fontSize: '13px', lineHeight: 1.4, marginTop: '3px' }}>
                                    {t.videoSub}
                                  </div>
                                </td>
                              </tr>
                            </table>

                            {/* ── Mode grid (shared component) — seamless navy
                                 tiles, cube art carries the colour, each tile a link ── */}
                            <ModeGrid
                              modes={modes}
                              rtl={rtl}
                              dir={dir}
                              sh={sh}
                              header={t.modesHeader}
                              palette={{
                                tileBg: C.tileBg,
                                tileBorder: C.tileBorder,
                                title: C.white,
                                tagline: C.grayLight,
                                header: C.grayLight,
                                black: C.black,
                              }}
                            />

                            {/* ── CTA ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                              style={{ marginTop: '12px' }}>
                              <tr>
                                <td align="center" style={{ paddingBottom: '14px' }}>
                                  <table role="presentation" cellPadding={0} cellSpacing={0}
                                    style={{ width: '100%', maxWidth: '340px', margin: '0 auto' }}>
                                    <tr>
                                      <td align="center" style={{
                                        backgroundColor: C.lime,
                                        borderRadius: '14px',
                                        border: `3px solid ${C.black}`,
                                        boxShadow: `${sh}6px 6px 0px ${C.black}`,
                                      }}>
                                        <Button
                                          href={playUrl}
                                          className="cta-btn"
                                          style={{
                                            display: 'inline-block',
                                            backgroundColor: C.lime,
                                            color: C.black,
                                            fontSize: '17px',
                                            fontWeight: 700,
                                            textDecoration: 'none',
                                            padding: '16px 32px',
                                            borderRadius: '14px',
                                            fontFamily: "'Fredoka', Arial, sans-serif",
                                            letterSpacing: '0.5px',
                                            textAlign: 'center',
                                            textTransform: 'uppercase' as const,
                                          }}
                                        >
                                          {t.cta}
                                        </Button>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            {/* ── Witty PS ── */}
                            <Text style={{
                              color: C.grayLight,
                              fontSize: '13px',
                              fontStyle: 'italic',
                              textAlign: 'center',
                              margin: '4px 0 0',
                              lineHeight: '1.5',
                              direction: dir,
                            }}>
                              {t.ps}
                            </Text>

                            {/* ── Android app callout — "also on Android, grab it on Google Play".
                                 A quiet secondary CTA (cream Play badge) so it never competes with
                                 the lime "Play now" focal point above. ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                              style={{ marginTop: '24px' }}>
                              <tr>
                                <td style={{ borderTop: `1px solid ${C.grayDark}`, fontSize: 0, lineHeight: 0 }}>&nbsp;</td>
                              </tr>
                              <tr>
                                <td align="center" style={{ paddingTop: '20px', direction: dir }}>
                                  <Text style={{
                                    color: C.white,
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    margin: '0 0 14px',
                                    lineHeight: '1.5',
                                    direction: dir,
                                  }}>
                                    {t.androidLabel}
                                  </Text>
                                  <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 auto' }}>
                                    <tr>
                                      <td style={{
                                        backgroundColor: C.white,
                                        borderRadius: '12px',
                                        border: `3px solid ${C.black}`,
                                        boxShadow: `${sh}5px 5px 0px ${C.black}`,
                                      }}>
                                        <Link
                                          href={androidPlayUrl}
                                          target="_blank"
                                          style={{
                                            display: 'inline-block',
                                            padding: '12px 22px',
                                            fontSize: '15px',
                                            fontWeight: 700,
                                            color: C.black,
                                            textDecoration: 'none',
                                            fontFamily: "'Fredoka', Arial, sans-serif",
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          <Img
                                            src={playIconUrl}
                                            alt="Google Play"
                                            width="22"
                                            height="22"
                                            style={{
                                              display: 'inline-block',
                                              verticalAlign: 'middle',
                                              border: 0,
                                              outline: 'none',
                                              ...(rtl ? { marginLeft: '9px' } : { marginRight: '9px' }),
                                            }}
                                          />
                                          <span style={{ verticalAlign: 'middle' }}>{t.androidCta}</span>
                                        </Link>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* ── Footer ── */}
                  <tr>
                    <td style={{ paddingTop: '24px' }}>
                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                        style={{ marginBottom: '20px' }}>
                        <tr>
                          <td style={{ borderTop: `1px solid ${C.grayDark}` }}>&nbsp;</td>
                        </tr>
                      </table>

                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                        <tr>
                          <td align="center" dir={dir}>
                            <Text style={{
                              color: C.footer, fontSize: '12px', margin: '0 0 12px',
                              lineHeight: '1.6', direction: dir,
                            }}>
                              {t.footerReason}
                            </Text>
                            <Text style={{ color: C.footer, fontSize: '12px', margin: '0', lineHeight: '1.6' }}>
                              <Link href={unsubscribeUrl} target="_blank"
                                style={{ color: C.grayLight, textDecoration: 'underline' }}>
                                {t.unsubscribe}
                              </Link>
                              <span style={{ color: C.grayDark }}>&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                              <Link href={playUrl} target="_blank"
                                style={{ color: C.grayLight, textDecoration: 'underline' }}>
                                LexiClash
                              </Link>
                              <span style={{ color: C.grayDark }}>&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                              <Link href={privacyUrl} target="_blank"
                                style={{ color: C.grayLight, textDecoration: 'underline' }}>
                                {t.privacy}
                              </Link>
                            </Text>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                        style={{ marginTop: '24px' }}>
                        <tr>
                          <td align="center">
                            <span style={{ color: C.grayDark, fontSize: '11px' }}>
                              &copy; {year} LexiClash
                            </span>
                          </td>
                        </tr>
                      </table>
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

WelcomeEmail.PreviewProps = {
  recipientName: 'Maya',
  language: 'en',
  unsubscribeUrl: 'https://www.lexiclash.live/api/email/unsubscribe?token=test123',
  playUrl: 'https://www.lexiclash.live/en',
  videoUrl: 'https://www.lexiclash.live/en?tour=1',
  baseUrl: '',
  androidUrl: 'https://play.google.com/store/apps/details?id=live.lexiclash.app',
  modes: getWelcomeEmailModes('en', ''),
} satisfies WelcomeEmailProps;

export { WelcomeEmail };
