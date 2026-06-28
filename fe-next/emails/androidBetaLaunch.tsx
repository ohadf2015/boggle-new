/**
 * Android Closed Beta Launch Email — LexiClash
 *
 * Invitation to existing players to install the Android app from the
 * Play Store closed beta track. Mirrors gameModeAnnouncement.tsx shape
 * (neo-brutalist, mascot + hero + feature trio + CTA + urgency + footer)
 * so it slots into the same admin preview/send infra.
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

export interface AndroidBetaLaunchEmailProps {
  recipientName: string;
  language: string;
  unsubscribeUrl: string;
  playUrl: string;
}

interface BetaCopy {
  badge: string;
  title: string;
  tagline: string;
  intro: (name: string) => string;
  reminderTitle: string;
  reminder: string;
  features: [string, string, string];
  featureDescriptions: [string, string, string];
  cta: string;
  urgency: string;
  footerReason: string;
  unsubscribe: string;
  privacy: string;
}

/* ───────────────────────── Copy ───────────────────────── */

const COPY: Record<string, BetaCopy> = {
  en: {
    badge: 'CLOSED BETA',
    title: 'LEXICLASH ON ANDROID',
    tagline: 'You were hand-picked for the closed beta',
    intro: (n) =>
      `${n}, we picked you. The LexiClash Android app is in closed beta — tap install and be one of the first to play on your phone.`,
    reminderTitle: 'Quick reminder — what is LexiClash?',
    reminder:
      'A loud, word-powered arena: Word Hunt duels, Blast combos, Adventure quests, Connections puzzles, a daily challenge, gold, XP, streaks and a marshmallow mascot that cheers you on.',
    features: ['Faster Launch', 'Native Feel', 'Same Account'],
    featureDescriptions: [
      'Starts in a blink — no browser tax',
      'Haptics, offline puzzles, push nudges',
      'Your progress, coins & streaks carry over',
    ],
    cta: 'Install the Android App',
    urgency: 'Beta seats are limited — grab yours before it fills up',
    footerReason: 'You subscribed to LexiClash updates.',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
  },
  he: {
    badge: 'בטא סגורה',
    title: 'לקסיקלאש על אנדרואיד',
    tagline: 'נבחרת אישית לבטא הסגורה',
    intro: (n) =>
      `${n}, בחרנו בך. אפליקציית LexiClash לאנדרואיד בבטא סגורה — הורד/הורידי והיה/י מהראשונים לשחק.`,
    reminderTitle: 'תזכורת קצרה — מה זה LexiClash?',
    reminder:
      'זירת מילים רועשת: דו-קרבות ווורד האנט, קומבואים של בלאסט, הרפתקאות, חידות קונקשנז, אתגר יומי, זהב, XP, רצפים, ומסקוט מרשמלו שמעודד אותך.',
    features: ['הפעלה מהירה', 'תחושה טבעית', 'אותו חשבון'],
    featureDescriptions: [
      'נפתח מיד — בלי דפדפן',
      'רטט, חידות אופליין, התראות',
      'ההתקדמות, המטבעות והרצפים נשמרים',
    ],
    cta: 'התקן/י את האפליקציה',
    urgency: 'מקומות הבטא מוגבלים — תפוס/י לפני שייגמר',
    footerReason: 'נרשמת לעדכוני LexiClash.',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
  },
  sv: {
    badge: 'STÄNGD BETA',
    title: 'LEXICLASH PÅ ANDROID',
    tagline: 'Du är handplockad till den stängda betan',
    intro: (n) =>
      `${n}, vi valde dig. LexiClash Android-appen är i stängd beta — installera och var bland de första att spela.`,
    reminderTitle: 'Snabb påminnelse — vad är LexiClash?',
    reminder:
      'En högljudd ord-arena: Word Hunt-dueller, Blast-combos, Adventure-uppdrag, Connections-pussel, daglig utmaning, guld, XP, streaks och en marshmallow-maskot.',
    features: ['Snabb start', 'Native-känsla', 'Samma konto'],
    featureDescriptions: [
      'Startar direkt — ingen webbläsar-skatt',
      'Haptik, offlinepussel, notiser',
      'Framsteg, mynt och streaks följer med',
    ],
    cta: 'Installera Android-appen',
    urgency: 'Beta-platserna är begränsade — ta din nu',
    footerReason: 'Du prenumererar på LexiClash-uppdateringar.',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
  },
  ja: {
    badge: 'クローズドベータ',
    title: 'Android版LexiClash',
    tagline: 'クローズドベータに招待されました',
    intro: (n) =>
      `${n}さん、あなたを選びました。LexiClashのAndroidアプリはクローズドベータ中 — インストールしていち早く遊ぼう。`,
    reminderTitle: 'おさらい — LexiClashって？',
    reminder:
      '騒がしい言葉のアリーナ：ワードハント、ブラスト、アドベンチャー、コネクションズ、毎日チャレンジ、ゴールド、XP、連勝、マシュマロマスコット。',
    features: ['高速起動', 'ネイティブ体感', '同じアカウント'],
    featureDescriptions: [
      'ブラウザなしで即起動',
      '触覚・オフライン・通知',
      '進行度・コイン・連勝が引き継がれます',
    ],
    cta: 'Androidアプリを入手',
    urgency: 'ベータ枠には限りあり — 早めに確保',
    footerReason: 'LexiClashのアップデートを購読しています。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
  },
  es: {
    badge: 'BETA CERRADA',
    title: 'LEXICLASH EN ANDROID',
    tagline: 'Fuiste elegido para la beta cerrada',
    intro: (n) =>
      `${n}, te elegimos. La app de LexiClash para Android está en beta cerrada — instálala y sé de los primeros en jugar.`,
    reminderTitle: 'Recordatorio rápido — ¿qué es LexiClash?',
    reminder:
      'Una arena ruidosa de palabras: duelos Word Hunt, combos Blast, misiones Adventure, puzles Connections, reto diario, oro, XP, rachas y una mascota malvavisco.',
    features: ['Arranque rápido', 'Sensación nativa', 'Misma cuenta'],
    featureDescriptions: [
      'Abre al instante — sin navegador',
      'Vibración, puzles offline, notificaciones',
      'Tu progreso, monedas y rachas se mantienen',
    ],
    cta: 'Instalar app de Android',
    urgency: 'Los cupos de beta son limitados — asegura el tuyo',
    footerReason: 'Te suscribiste a las novedades de LexiClash.',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
  },
};

/* ───────────────────────── Subject lines ───────────────────────── */

const SUBJECTS: Record<string, (name: string) => string> = {
  en: (n) => `${n}, you're in — Android beta is yours`,
  he: (n) => `${n}, אתם בפנים. בטא אנדרואיד מחכה לכם`,
  sv: (n) => `${n}, du är med. Android-betan är din`,
  ja: (n) => `${n}さん、当選です。Androidベータへようこそ`,
  es: (n) => `${n}, estás dentro. La beta de Android es tuya`,
};

export function getAndroidBetaLaunchSubject(
  language: string,
  recipientName: string
): string {
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
  white: '#FFFFFF',
  black: '#000000',
  grayDark: '#374151',
  grayLight: '#9CA3AF',
  urgencyBg: '#1a2b1a',
  urgencyBorder: '#3d5a2e',
} as const;

const HERO_IMAGE =
  'https://www.lexiclash.live/email-assets/android-beta-hero.jpg';
const MASCOT_URL = 'https://www.lexiclash.live/mascot/flexing.gif';

/* ───────────────────────── Component ───────────────────────── */

export default function AndroidBetaLaunchEmail({
  recipientName,
  language,
  unsubscribeUrl,
  playUrl,
}: AndroidBetaLaunchEmailProps) {
  const t = COPY[language] || COPY.en;
  const accent = C.lime;

  const rtl = language === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const sh = rtl ? '-' : '';
  const arrow = rtl ? '\u25C0' : '\u25B6';
  const locale = ['he', 'sv', 'ja', 'es'].includes(language) ? language : 'en';
  const privacyUrl = `https://lexiclash.live/${locale}/privacy`;
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
            [data-ogsc] .cta-btn { background-color: ${accent} !important; color: ${C.black} !important; }
            [data-ogsc] .tag { color: ${accent} !important; }
            @media (max-width: 480px) {
              .hero-img { width: 100% !important; height: auto !important; }
              .mascot-badge { width: 120px !important; height: 120px !important; }
              .mascot-img { width: 112px !important; height: 112px !important; }
              .h1 { font-size: 24px !important; }
              .feature-td { display: block !important; width: 100% !important; padding-bottom: 12px !important; }
            }
          `}</style>
        </Head>

        <Preview>
          {t.title} — {t.tagline}
        </Preview>

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

                  {/* Text logo */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '18px' }}>
                      <Link
                        href={playUrl}
                        target="_blank"
                        style={{
                          color: C.lime,
                          fontSize: '22px',
                          fontWeight: 700,
                          letterSpacing: '4px',
                          textDecoration: 'none',
                          fontFamily: "'Fredoka', Arial, sans-serif",
                        }}
                      >
                        LEXICLASH
                      </Link>
                    </td>
                  </tr>

                  {/* Main Card */}
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
                          <td
                            style={{
                              background: `linear-gradient(90deg, ${C.lime}, ${C.cyan}, ${C.pink})`,
                              height: '6px',
                              fontSize: 0,
                              lineHeight: 0,
                            }}
                          >
                            &nbsp;
                          </td>
                        </tr>

                        <tr>
                          <td style={{ padding: '24px 24px 28px' }}>

                            {/* Badge */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td align="center" style={{ paddingBottom: '14px' }}>
                                  <table role="presentation" cellPadding={0} cellSpacing={0}>
                                    <tr>
                                      <td
                                        style={{
                                          backgroundColor: accent,
                                          border: `3px solid ${C.black}`,
                                          borderRadius: '999px',
                                          padding: '6px 18px',
                                          boxShadow: `${sh}3px 3px 0px ${C.black}`,
                                        }}
                                      >
                                        <span
                                          style={{
                                            color: C.black,
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            letterSpacing: '2px',
                                            textTransform: 'uppercase' as const,
                                            fontFamily: "'Fredoka', Arial, sans-serif",
                                          }}
                                        >
                                          ✦ {t.badge} ✦
                                        </span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            {/* Mascot */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td align="center" style={{ paddingBottom: '14px' }}>
                                  <table role="presentation" cellPadding={0} cellSpacing={0}>
                                    <tr>
                                      <td
                                        className="mascot-badge"
                                        align="center"
                                        valign="middle"
                                        width={148}
                                        height={148}
                                        style={{
                                          width: '148px',
                                          height: '148px',
                                          backgroundColor: accent,
                                          borderRadius: '9999px',
                                          border: `4px solid ${C.black}`,
                                          boxShadow: `${sh}6px 6px 0px ${C.black}`,
                                          overflow: 'hidden',
                                          lineHeight: 0,
                                          fontSize: 0,
                                        }}
                                      >
                                        <Img
                                          src={MASCOT_URL}
                                          alt="Lexi mascot"
                                          width="140"
                                          height="140"
                                          className="mascot-img"
                                          style={{
                                            display: 'block',
                                            width: '140px',
                                            height: '140px',
                                            borderRadius: '9999px',
                                            border: 0,
                                            outline: 'none',
                                          }}
                                        />
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            {/* Title */}
                            <Heading
                              as="h1"
                              className="h1"
                              style={{
                                color: C.white,
                                fontSize: '30px',
                                margin: '0 0 6px',
                                fontWeight: 700,
                                textAlign: 'center',
                                lineHeight: '1.2',
                                direction: dir,
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.5px',
                              }}
                            >
                              {t.title}
                            </Heading>

                            <Text
                              className="tag"
                              style={{
                                color: accent,
                                fontSize: '15px',
                                margin: '0 0 16px',
                                fontWeight: 600,
                                textAlign: 'center',
                                lineHeight: '1.5',
                                direction: dir,
                              }}
                            >
                              {t.tagline}
                            </Text>

                            {/* Hero image */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                              style={{ marginBottom: '18px' }}>
                              <tr>
                                <td align="center"
                                  style={{
                                    backgroundColor: C.cardInner,
                                    borderRadius: '14px',
                                    border: `3px solid ${C.black}`,
                                    padding: '12px',
                                  }}>
                                  <Img
                                    src={HERO_IMAGE}
                                    alt="LexiClash on Android"
                                    width="480"
                                    className="hero-img"
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      maxWidth: '480px',
                                      height: 'auto',
                                      borderRadius: '10px',
                                      border: 0,
                                      outline: 'none',
                                    }}
                                  />
                                </td>
                              </tr>
                            </table>

                            {/* Intro */}
                            <Text
                              style={{
                                color: C.white,
                                fontSize: '16px',
                                margin: '0 0 16px',
                                textAlign: 'center',
                                lineHeight: '1.55',
                                direction: dir,
                                fontWeight: 500,
                              }}
                            >
                              {t.intro(recipientName)}
                            </Text>

                            {/* Reminder block */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                              style={{ marginBottom: '20px' }}>
                              <tr>
                                <td
                                  style={{
                                    backgroundColor: C.cardInner,
                                    border: `2px solid ${C.cyan}`,
                                    borderRadius: '12px',
                                    padding: '14px 16px',
                                  }}
                                >
                                  <div
                                    style={{
                                      color: C.cyan,
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      textTransform: 'uppercase' as const,
                                      letterSpacing: '1px',
                                      marginBottom: '6px',
                                      direction: dir,
                                    }}
                                  >
                                    {t.reminderTitle}
                                  </div>
                                  <div
                                    style={{
                                      color: C.grayLight,
                                      fontSize: '13px',
                                      lineHeight: 1.55,
                                      direction: dir,
                                    }}
                                  >
                                    {t.reminder}
                                  </div>
                                </td>
                              </tr>
                            </table>

                            {/* Feature trio */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                              style={{ marginBottom: '20px' }}>
                              <tr>
                                {([0, 1, 2] as const).map((i) => (
                                  <td key={`feature-${i}`} width="33%" align="center" valign="top"
                                    className="feature-td"
                                    style={{ padding: '0 4px' }}>
                                    <table role="presentation" cellPadding={0} cellSpacing={0} width="100%"
                                      style={{
                                        backgroundColor: C.cardInner,
                                        border: `2px solid ${accent}`,
                                        borderRadius: '12px',
                                      }}>
                                      <tr>
                                        <td align="center" style={{ padding: '14px 8px' }}>
                                          <div style={{
                                            color: accent,
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase' as const,
                                            letterSpacing: '0.8px',
                                            lineHeight: 1.3,
                                            marginBottom: '4px',
                                          }}>
                                            {t.features[i]}
                                          </div>
                                          <div style={{
                                            color: C.grayLight,
                                            fontSize: '11px',
                                            lineHeight: 1.4,
                                          }}>
                                            {t.featureDescriptions[i]}
                                          </div>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                ))}
                              </tr>
                            </table>

                            {/* CTA */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td align="center" style={{ paddingBottom: '18px' }}>
                                  <table role="presentation" cellPadding={0} cellSpacing={0}
                                    style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
                                    <tr>
                                      <td align="center"
                                        style={{
                                          backgroundColor: accent,
                                          borderRadius: '14px',
                                          border: `3px solid ${C.black}`,
                                          boxShadow: `${sh}6px 6px 0px ${C.black}`,
                                        }}>
                                        <Button
                                          href={playUrl}
                                          className="cta-btn"
                                          style={{
                                            display: 'inline-block',
                                            backgroundColor: accent,
                                            color: C.black,
                                            fontSize: '17px',
                                            fontWeight: 700,
                                            textDecoration: 'none',
                                            padding: '16px 28px',
                                            borderRadius: '14px',
                                            fontFamily: "'Fredoka', Arial, sans-serif",
                                            letterSpacing: '1px',
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

                            {/* Urgency */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td
                                  style={{
                                    backgroundColor: C.urgencyBg,
                                    border: `2px solid ${C.urgencyBorder}`,
                                    borderRadius: '10px',
                                    padding: '14px 18px',
                                  }}
                                >
                                  <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                                    <tr>
                                      <td width="32" valign="middle">
                                        <span style={{ fontSize: '20px' }}>🤖</span>
                                      </td>
                                      <td valign="middle">
                                        <span
                                          style={{
                                            color: C.lime,
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            lineHeight: '1.4',
                                            direction: dir,
                                          }}
                                        >
                                          {t.urgency}
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
                    </td>
                  </tr>

                  {/* Footer */}
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
                            <Text
                              style={{
                                color: C.footer,
                                fontSize: '12px',
                                margin: '0 0 12px',
                                lineHeight: '1.6',
                                direction: dir,
                              }}
                            >
                              {t.footerReason}
                            </Text>
                            <Text style={{ color: C.footer, fontSize: '12px', margin: '0', lineHeight: '1.6' }}>
                              <Link href={unsubscribeUrl} target="_blank"
                                style={{ color: C.grayLight, textDecoration: 'underline' }}>
                                {t.unsubscribe}
                              </Link>
                              <span style={{ color: C.grayDark }}>&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                              <Link href="https://lexiclash.live" target="_blank"
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

AndroidBetaLaunchEmail.PreviewProps = {
  recipientName: 'Word Hunter',
  language: 'en',
  unsubscribeUrl:
    'https://lexiclash.live/api/email/unsubscribe?token=test123',
  playUrl:
    'https://play.google.com/store/apps/details?id=live.lexiclash.app',
} satisfies AndroidBetaLaunchEmailProps;
