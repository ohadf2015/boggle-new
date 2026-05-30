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

/* ───────────────────────── Types ───────────────────────── */

export type ModeAccent = 'lime' | 'pink' | 'cyan' | 'purple';

export interface WelcomeEmailProps {
  recipientName: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string; // where the CTA goes
  videoUrl: string; // hosted tour clip (YouTube / mux / etc.)
  baseUrl?: string; // asset origin; defaults to production
}

interface ModeDef {
  key: string;
  label: string; // brand mode name (kept in latin for all langs)
  emoji: string;
  accent: ModeAccent;
  path: string; // route under /[locale]
}

interface WelcomeCopy {
  heading: (name: string) => string; // "Hi {name} 👋"
  intro: string;
  videoLabel: string;
  videoSub: string;
  modesHeader: string;
  taglines: Record<string, string>;
  cta: string;
  ps: string;
  footerReason: string;
  unsubscribe: string;
  privacy: string;
}

/* ───────────────────────── Flagship modes ─────────────────────────
   Color-coded across the 4 neo-brutalist families for a rainbow grid. */

const MODES: ModeDef[] = [
  { key: 'multiplayer', label: 'Multiplayer', emoji: '🥊', accent: 'pink', path: 'multiplayer' },
  { key: 'blast', label: 'Blast', emoji: '💥', accent: 'cyan', path: 'blast' },
  { key: 'daily', label: 'Daily Word Hunt', emoji: '🎯', accent: 'lime', path: 'daily' },
  { key: 'wordTower', label: 'Word Tower', emoji: '🗼', accent: 'purple', path: 'word-tower' },
  { key: 'connections', label: 'Connections', emoji: '🧩', accent: 'cyan', path: 'connections' },
  { key: 'adventure', label: 'Adventure', emoji: '🗺️', accent: 'lime', path: 'adventure' },
];

/* ───────────────────────── Copy — per language ───────────────────────── */

const COPY: Record<string, WelcomeCopy> = {
  en: {
    heading: (n) => `Hi ${n} 👋`,
    intro: "You're in. Pick a mode, pick a fight 👇",
    videoLabel: 'See it move (40 sec)',
    videoSub: "Spoiler: it's chaos",
    modesHeader: 'PICK YOUR FIGHT',
    taglines: {
      multiplayer: 'Live brawls, real people',
      blast: 'Combo till it pops',
      daily: 'One puzzle. Everyone.',
      wordTower: "Stack high, don't fall",
      connections: 'Spot the hidden links',
      adventure: 'Solo quest, weird worlds',
    },
    cta: 'Play now',
    ps: "Fair warning: it's addictive.",
    footerReason: 'You just joined LexiClash.',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
  },
  he: {
    heading: (n) => `היי ${n} 👋`,
    intro: 'יאללה, את/ה בפנים. בחר/י מצב, בחר/י קרב 👇',
    videoLabel: 'תראו איך זה זז (40 שניות)',
    videoSub: 'ספוילר: בלאגן',
    modesHeader: 'בחרו את הקרב',
    taglines: {
      multiplayer: 'קרבות חיים מול אנשים',
      blast: 'קומבו עד שמתפוצץ',
      daily: 'חידה אחת. כולם.',
      wordTower: 'לבנות גבוה, בלי ליפול',
      connections: 'למצוא את הקשרים',
      adventure: 'מסע יחיד, עולמות מוזרים',
    },
    cta: 'יאללה, משחקים',
    ps: 'אזהרה: זה ממכר.',
    footerReason: 'הרגע הצטרפת ל-LexiClash.',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
  },
  sv: {
    heading: (n) => `Hej ${n} 👋`,
    intro: 'Du är med. Välj ett läge och kör 👇',
    videoLabel: 'Se det i rörelse (40 sek)',
    videoSub: 'Spoiler: rena kaoset',
    modesHeader: 'VÄLJ DIN MATCH',
    taglines: {
      multiplayer: 'Live mot riktiga spelare',
      blast: 'Kedja tills det smäller',
      daily: 'Ett pussel. Alla.',
      wordTower: 'Stapla högt, ramla inte',
      connections: 'Hitta dolda kopplingar',
      adventure: 'Soloäventyr, skumma världar',
    },
    cta: 'Spela nu',
    ps: 'Varning: beroendeframkallande.',
    footerReason: 'Du gick precis med i LexiClash.',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
  },
  ja: {
    heading: (n) => `${n}さん、こんにちは 👋`,
    intro: 'ようこそ。モードを選んで、さあ一戦 👇',
    videoLabel: '動きを見る（40秒）',
    videoSub: 'ネタバレ：大騒ぎ',
    modesHeader: '勝負を選べ',
    taglines: {
      multiplayer: '生バトル、相手は本物',
      blast: '連鎖で大爆発',
      daily: '一つの問題、みんなで',
      wordTower: '高く積め、崩すな',
      connections: '隠れた繋がりを探せ',
      adventure: 'ひとり旅、奇妙な世界',
    },
    cta: '今すぐ遊ぶ',
    ps: '注意：ハマります。',
    footerReason: 'LexiClashに登録しました。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
  },
  es: {
    heading: (n) => `Hola ${n} 👋`,
    intro: 'Ya estás dentro. Elige modo y a jugar 👇',
    videoLabel: 'Míralo en acción (40 s)',
    videoSub: 'Spoiler: puro caos',
    modesHeader: 'ELIGE TU BATALLA',
    taglines: {
      multiplayer: 'Duelos en vivo, gente real',
      blast: 'Combos hasta reventar',
      daily: 'Un reto. Todos.',
      wordTower: 'Apila alto, no caigas',
      connections: 'Halla los grupos ocultos',
      adventure: 'Aventura sola, mundos raros',
    },
    cta: 'Jugar ya',
    ps: 'Aviso: engancha.',
    footerReason: 'Acabas de unirte a LexiClash.',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
  },
};

/* ───────────────────────── Subject lines ───────────────────────── */

const SUBJECTS: Record<string, (name: string) => string> = {
  en: (n) => `Hi ${n} 👋`,
  he: (n) => `היי ${n} 👋`,
  sv: (n) => `Hej ${n} 👋`,
  ja: (n) => `${n}さん、こんにちは 👋`,
  es: (n) => `Hola ${n} 👋`,
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
  border: '#000000',
  footer: '#666666',
  lime: '#A8E600',
  pink: '#FF1493',
  cyan: '#5CE0D6',
  purple: '#8B5CF6',
  white: '#FFFFFF',
  black: '#000000',
  grayDark: '#374151',
  grayLight: '#9CA3AF',
} as const;

const ACCENT_HEX: Record<ModeAccent, string> = {
  lime: C.lime,
  pink: C.pink,
  cyan: C.cyan,
  purple: C.purple,
};

const DEFAULT_BASE = 'https://www.lexiclash.live';

/* ───────────────────────── Component ───────────────────────── */

export default function WelcomeEmail({
  recipientName,
  language,
  unsubscribeUrl,
  playUrl,
  videoUrl,
  baseUrl = DEFAULT_BASE,
}: WelcomeEmailProps) {
  const t = COPY[language] || COPY.en;

  const rtl = language === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const sh = rtl ? '-' : ''; // hard-shadow direction flips in RTL
  const arrow = rtl ? '◀' : '▶';
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';
  const privacyUrl = `${baseUrl}/${locale}/privacy`;
  // Dev preview server serves from emails/static; production serves from public/email.
  const heroUrl = baseUrl ? `${baseUrl}/email/welcome-hero.jpg` : '/static/welcome-hero.jpg';
  const posterUrl = baseUrl
    ? `${baseUrl}/email/welcome-video-poster.jpg`
    : '/static/welcome-video-poster.jpg';
  const logoLang = rtl ? 'he' : 'en';
  const logoUrl = baseUrl
    ? `${baseUrl}/email-assets/email-logo-${logoLang}.png`
    : `/static/email-logo-${logoLang}.png`;
  const year = new Date().getFullYear();

  // Pair modes into rows of two for the responsive grid.
  const modeRows: ModeDef[][] = [];
  for (let i = 0; i < MODES.length; i += 2) modeRows.push(MODES.slice(i, i + 2));

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

                        {/* Rainbow accent strip */}
                        <tr>
                          <td style={{
                            background: `linear-gradient(90deg, ${C.lime}, ${C.cyan}, ${C.pink}, ${C.purple})`,
                            height: '6px', fontSize: 0, lineHeight: 0,
                          }}>&nbsp;</td>
                        </tr>

                        <tr>
                          <td style={{ padding: '24px 24px 28px' }}>

                            {/* ── Hero image ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                              style={{ marginBottom: '20px' }}>
                              <tr>
                                <td align="center" style={{
                                  backgroundColor: C.cardInner,
                                  borderRadius: '14px',
                                  border: `3px solid ${C.black}`,
                                  padding: '10px',
                                }}>
                                  <Img
                                    src={heroUrl}
                                    alt="Welcome to LexiClash — a party of word games"
                                    width="486"
                                    className="hero-img"
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      maxWidth: '486px',
                                      height: 'auto',
                                      borderRadius: '10px',
                                      border: 0,
                                      outline: 'none',
                                    }}
                                  />
                                </td>
                              </tr>
                            </table>

                            {/* ── "Hi {name}" heading ── */}
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

                            {/* ── Video card: clickable poster (play button baked into the image —
                                 email clients can't embed <video> or reliably overlay a button) ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                              style={{ marginBottom: '24px' }}>
                              <tr>
                                <td align="center">
                                  <Link href={videoUrl} target="_blank" style={{ textDecoration: 'none' }}>
                                    <Img
                                      src={posterUrl}
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
                                      {arrow}&nbsp;&nbsp;{t.videoLabel}
                                    </span>
                                  </Link>
                                  <div style={{ color: C.grayLight, fontSize: '13px', lineHeight: 1.4, marginTop: '3px' }}>
                                    {t.videoSub}
                                  </div>
                                </td>
                              </tr>
                            </table>

                            {/* ── Modes header ── */}
                            <Text style={{
                              color: C.grayLight,
                              fontSize: '12px',
                              fontWeight: 700,
                              letterSpacing: '2px',
                              textTransform: 'uppercase' as const,
                              textAlign: 'center',
                              margin: '0 0 14px',
                              direction: dir,
                            }}>
                              ✦ {t.modesHeader} ✦
                            </Text>

                            {/* ── Mode grid (2 cols) ── */}
                            {modeRows.map((row, ri) => (
                              <table key={`mode-row-${ri}`} role="presentation" cellPadding={0} cellSpacing={0}
                                width="100%" style={{ marginBottom: '12px' }}>
                                <tr>
                                  {row.map((m) => {
                                    const accent = ACCENT_HEX[m.accent];
                                    return (
                                      <td key={m.key} width="50%" valign="top" className="mode-td"
                                        style={{ padding: rtl ? '0 0 0 6px' : '0 6px 0 0' }}>
                                        <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                                          style={{
                                            backgroundColor: C.cardInner,
                                            border: `2px solid ${accent}`,
                                            borderRadius: '12px',
                                            height: '100%',
                                          }}>
                                          <tr>
                                            <td style={{ padding: '12px 12px', direction: dir }}>
                                              <div style={{
                                                color: accent, fontSize: '14px', fontWeight: 700,
                                                lineHeight: 1.3, marginBottom: '3px',
                                              }}>
                                                <span style={{ fontSize: '15px' }}>{m.emoji}</span>
                                                &nbsp;&nbsp;{m.label}
                                              </div>
                                              <div style={{ color: C.grayLight, fontSize: '12px', lineHeight: 1.4 }}>
                                                {t.taglines[m.key]}
                                              </div>
                                            </td>
                                          </tr>
                                        </table>
                                      </td>
                                    );
                                  })}
                                </tr>
                              </table>
                            ))}

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
                                          {arrow}&nbsp;&nbsp;{t.cta}
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
} satisfies WelcomeEmailProps;

export { WelcomeEmail };
