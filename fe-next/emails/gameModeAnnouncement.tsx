/**
 * Game Mode Announcement Email — LexiClash
 *
 * Reusable announcement template for launching a new game mode.
 * Preset per mode (blast, wordhunt, adventure, ...) + per language.
 * Neo-brutalist design matching reengagement.tsx: clipped-circle mascot,
 * hero image, feature trio, single CTA, RTL-aware, Gmail dark-mode safe.
 *
 * To announce a new mode: add entry to MODE_PRESETS + MODE_COPY.
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

export type GameModeKey = 'blast' | 'wordhunt' | 'adventure';
export type ModeAccent = 'lime' | 'pink' | 'cyan' | 'purple';

export interface GameModeAnnouncementEmailProps {
  recipientName: string;
  language: string;
  mode: GameModeKey;
  unsubscribeUrl: string;
  playUrl: string;
}

interface ModePreset {
  accent: ModeAccent;
  badgeLabel: string; // "NEW MODE" etc
  heroImageUrl: string; // absolute URL — gif or png
  heroImageAlt: string;
  mascotUrl: string; // absolute URL — circular marshmallow mascot gif
}

interface ModeCopy {
  title: string;
  tagline: string;
  intro: (name: string) => string;
  features: [string, string, string]; // [label1, label2, label3]
  featureDescriptions: [string, string, string];
  cta: string;
  urgency: string;
  footerReason: string;
  unsubscribe: string;
  privacy: string;
}

/* ───────────────────────── Mode Presets ───────────────────────── */

const MODE_PRESETS: Record<GameModeKey, ModePreset> = {
  blast: {
    accent: 'pink',
    badgeLabel: 'NEW MODE',
    heroImageUrl: 'https://www.lexiclash.live/modes/blast.png',
    heroImageAlt: 'Blast Mode — explosive word puzzles',
    mascotUrl: 'https://www.lexiclash.live/mascot/onfire-nobg.gif',
  },
  wordhunt: {
    accent: 'pink',
    badgeLabel: 'NEW MODE',
    heroImageUrl: 'https://www.lexiclash.live/modes/wordhunt.png',
    heroImageAlt: 'Word Hunt multiplayer',
    mascotUrl: 'https://www.lexiclash.live/mascot/flexing.gif',
  },
  adventure: {
    accent: 'purple',
    badgeLabel: 'NEW MODE',
    heroImageUrl: 'https://www.lexiclash.live/modes/adventure.png',
    heroImageAlt: 'Adventure Mode',
    mascotUrl: 'https://www.lexiclash.live/mascot/explorer-nobg.gif',
  },
};

/* ───────────────────────── Copy — per mode × per language ───────────────────────── */

const MODE_COPY: Record<GameModeKey, Record<string, ModeCopy>> = {
  blast: {
    en: {
      title: 'BLAST MODE IS LIVE',
      tagline: 'Chain-react your way to word-powered explosions',
      intro: (n) => `${n}, we made something loud for you.`,
      features: ['Chain Blasts', 'Power Tiles', 'Boss Rush'],
      featureDescriptions: ['Trigger combo reactions', 'Bombs, prisms, lightning', 'New weekly bosses'],
      cta: 'Play Blast Mode',
      urgency: 'Jump in now — your first 3 boss runs earn bonus gold',
      footerReason: 'You subscribed to LexiClash updates.',
      unsubscribe: 'Unsubscribe',
      privacy: 'Privacy',
    },
    he: {
      title: 'מצב בלאסט עלה לאוויר',
      tagline: 'תגובות שרשרת, פיצוצי מילים, כיף רועש',
      intro: (n) => `${n}, הכנו משהו נפיץ במיוחד בשבילך.`,
      features: ['פיצוצי שרשרת', 'אריחי עוצמה', 'קרב בוסים'],
      featureDescriptions: ['הפעל תגובות קומבו', 'פצצות, פריזמות, ברקים', 'בוסים חדשים כל שבוע'],
      cta: 'שחק/י במצב בלאסט',
      urgency: 'קפוץ/קפצי עכשיו — 3 קרבות הבוס הראשונים עם זהב בונוס',
      footerReason: 'נרשמת לעדכוני LexiClash.',
      unsubscribe: 'ביטול הרשמה',
      privacy: 'פרטיות',
    },
    sv: {
      title: 'BLAST-LÄGET ÄR HÄR',
      tagline: 'Kedjereaktioner och ordexplosioner',
      intro: (n) => `${n}, vi gjorde något högljutt åt dig.`,
      features: ['Kedje-blast', 'Kraft-brickor', 'Boss Rush'],
      featureDescriptions: ['Utlös comboreaktioner', 'Bomber, prismor, blixtar', 'Nya veckoboss'],
      cta: 'Spela Blast-läget',
      urgency: 'Hoppa in nu — dina 3 första bossrundor ger bonusguld',
      footerReason: 'Du prenumererar på LexiClash-uppdateringar.',
      unsubscribe: 'Avprenumerera',
      privacy: 'Integritet',
    },
    ja: {
      title: 'ブラストモード登場',
      tagline: '連鎖爆発で言葉を吹き飛ばせ',
      intro: (n) => `${n}さん、騒がしいモードを作りました。`,
      features: ['連鎖ブラスト', 'パワータイル', 'ボスラッシュ'],
      featureDescriptions: ['コンボを起こそう', '爆弾・プリズム・稲妻', '毎週新ボス'],
      cta: 'ブラストモードで遊ぶ',
      urgency: '今すぐ参戦 — 最初の3回のボス戦でボーナスゴールド',
      footerReason: 'LexiClashのアップデートを購読しています。',
      unsubscribe: '配信停止',
      privacy: 'プライバシー',
    },
    es: {
      title: '¡MODO BLAST YA DISPONIBLE!',
      tagline: 'Reacciones en cadena y explosiones de palabras',
      intro: (n) => `${n}, hicimos algo ruidoso para ti.`,
      features: ['Combos en Cadena', 'Fichas de Poder', 'Jefes'],
      featureDescriptions: ['Activa reacciones combo', 'Bombas, prismas, rayos', 'Nuevos jefes semanales'],
      cta: 'Jugar Modo Blast',
      urgency: 'Entra ya — tus primeras 3 peleas de jefe dan oro extra',
      footerReason: 'Te suscribiste a las novedades de LexiClash.',
      unsubscribe: 'Cancelar suscripción',
      privacy: 'Privacidad',
    },
  },
  wordhunt: {
    en: {
      title: 'WORD HUNT IS LIVE',
      tagline: 'Real-time word battles, live opponents',
      intro: (n) => `${n}, your first match is waiting.`,
      features: ['Live PvP', 'Power-Ups', 'Ranked Ladder'],
      featureDescriptions: ['Beat real players', 'Shield, freeze, boost', 'Climb the ranks'],
      cta: 'Find a Match',
      urgency: 'Your first match earns bonus XP — jump in now',
      footerReason: 'You subscribed to LexiClash updates.',
      unsubscribe: 'Unsubscribe',
      privacy: 'Privacy',
    },
    he: {
      title: 'מצב ווורד האנט עלה',
      tagline: 'קרבות מילים בזמן אמת, שחקנים אמיתיים',
      intro: (n) => `${n}, המשחק הראשון שלך מחכה.`,
      features: ['PvP חי', 'חיזוקים', 'דירוג'],
      featureDescriptions: ['נגד שחקנים אמיתיים', 'מגן, קפאה, בוסט', 'טפס/י בדירוג'],
      cta: 'מצא/י משחק',
      urgency: 'המשחק הראשון שלך נותן XP בונוס — קפוץ/קפצי עכשיו',
      footerReason: 'נרשמת לעדכוני LexiClash.',
      unsubscribe: 'ביטול הרשמה',
      privacy: 'פרטיות',
    },
    sv: {
      title: 'WORD HUNT ÄR HÄR',
      tagline: 'Ordstrid i realtid, riktiga motståndare',
      intro: (n) => `${n}, din första match väntar.`,
      features: ['Live PvP', 'Power-Ups', 'Rankad'],
      featureDescriptions: ['Slå riktiga spelare', 'Sköld, frys, boost', 'Klättra i ranken'],
      cta: 'Hitta en match',
      urgency: 'Din första match ger bonus-XP — hoppa in nu',
      footerReason: 'Du prenumererar på LexiClash-uppdateringar.',
      unsubscribe: 'Avprenumerera',
      privacy: 'Integritet',
    },
    ja: {
      title: 'ワードハント登場',
      tagline: 'リアルタイム単語バトル',
      intro: (n) => `${n}さん、初戦が待ってます。`,
      features: ['ライブPvP', 'パワーアップ', 'ランク戦'],
      featureDescriptions: ['本物の相手と戦う', 'シールド・凍結・加速', 'ランクを登れ'],
      cta: 'マッチを探す',
      urgency: '初戦はボーナスXP — 今すぐ参戦',
      footerReason: 'LexiClashのアップデートを購読しています。',
      unsubscribe: '配信停止',
      privacy: 'プライバシー',
    },
    es: {
      title: '¡WORD HUNT YA DISPONIBLE!',
      tagline: 'Batallas de palabras en tiempo real',
      intro: (n) => `${n}, tu primera partida te espera.`,
      features: ['PvP en vivo', 'Potenciadores', 'Ranking'],
      featureDescriptions: ['Contra jugadores reales', 'Escudo, congelar, boost', 'Sube el ranking'],
      cta: 'Buscar partida',
      urgency: 'Tu primera partida da XP extra — entra ya',
      footerReason: 'Te suscribiste a las novedades de LexiClash.',
      unsubscribe: 'Cancelar suscripción',
      privacy: 'Privacidad',
    },
  },
  adventure: {
    en: {
      title: 'ADVENTURE MODE IS LIVE',
      tagline: 'A solo word quest through strange worlds',
      intro: (n) => `${n}, your expedition starts now.`,
      features: ['Story Levels', 'Loot & Runes', 'Boss Fights'],
      featureDescriptions: ['20+ hand-crafted levels', 'Earn upgrades', 'Defeat world bosses'],
      cta: 'Start Adventure',
      urgency: 'First chapter free — begin now',
      footerReason: 'You subscribed to LexiClash updates.',
      unsubscribe: 'Unsubscribe',
      privacy: 'Privacy',
    },
    he: {
      title: 'מצב הרפתקה עלה',
      tagline: 'מסע מילים יחיד דרך עולמות מוזרים',
      intro: (n) => `${n}, ההרפתקה שלך מתחילה עכשיו.`,
      features: ['שלבי סיפור', 'שלל ורונות', 'קרבות בוס'],
      featureDescriptions: ['20+ שלבים', 'צבור שדרוגים', 'הבס בוסים'],
      cta: 'התחל הרפתקה',
      urgency: 'הפרק הראשון חינם — התחל/י עכשיו',
      footerReason: 'נרשמת לעדכוני LexiClash.',
      unsubscribe: 'ביטול הרשמה',
      privacy: 'פרטיות',
    },
    sv: {
      title: 'ÄVENTYRSLÄGET ÄR HÄR',
      tagline: 'Ett ordäventyr genom märkliga världar',
      intro: (n) => `${n}, din expedition börjar nu.`,
      features: ['Banor', 'Loot & Runor', 'Boss-strider'],
      featureDescriptions: ['20+ handgjorda banor', 'Samla uppgraderingar', 'Besegra bossar'],
      cta: 'Starta äventyret',
      urgency: 'Första kapitlet gratis — börja nu',
      footerReason: 'Du prenumererar på LexiClash-uppdateringar.',
      unsubscribe: 'Avprenumerera',
      privacy: 'Integritet',
    },
    ja: {
      title: 'アドベンチャーモード登場',
      tagline: 'ひとり旅の言葉クエスト',
      intro: (n) => `${n}さん、冒険が始まります。`,
      features: ['ストーリー', '戦利品＆ルーン', 'ボス戦'],
      featureDescriptions: ['20以上のステージ', 'アップグレード', 'ワールドボス'],
      cta: '冒険を始める',
      urgency: '最初の章は無料 — 今すぐ開始',
      footerReason: 'LexiClashのアップデートを購読しています。',
      unsubscribe: '配信停止',
      privacy: 'プライバシー',
    },
    es: {
      title: '¡MODO AVENTURA YA DISPONIBLE!',
      tagline: 'Una búsqueda de palabras por mundos extraños',
      intro: (n) => `${n}, tu expedición comienza ahora.`,
      features: ['Niveles', 'Botín y Runas', 'Jefes'],
      featureDescriptions: ['20+ niveles diseñados', 'Gana mejoras', 'Derrota a los jefes'],
      cta: 'Comenzar aventura',
      urgency: 'Primer capítulo gratis — empieza ahora',
      footerReason: 'Te suscribiste a las novedades de LexiClash.',
      unsubscribe: 'Cancelar suscripción',
      privacy: 'Privacidad',
    },
  },
};

/* ───────────────────────── Subject lines ───────────────────────── */

export const ANNOUNCEMENT_SUBJECTS: Record<GameModeKey, Record<string, (name: string) => string>> = {
  blast: {
    en: (n) => `${n}, Blast Mode just dropped 💥`,
    he: (n) => `${n}, מצב בלאסט עלה לאוויר 💥`,
    sv: (n) => `${n}, Blast-läget är här 💥`,
    ja: (n) => `${n}さん、ブラストモード登場 💥`,
    es: (n) => `${n}, llegó el Modo Blast 💥`,
  },
  wordhunt: {
    en: (n) => `${n}, Word Hunt is live ⚡`,
    he: (n) => `${n}, ווורד האנט עלה ⚡`,
    sv: (n) => `${n}, Word Hunt är här ⚡`,
    ja: (n) => `${n}さん、ワードハント登場 ⚡`,
    es: (n) => `${n}, ¡Word Hunt está aquí! ⚡`,
  },
  adventure: {
    en: (n) => `${n}, your Adventure awaits 🗺️`,
    he: (n) => `${n}, ההרפתקה שלך מחכה 🗺️`,
    sv: (n) => `${n}, ditt äventyr väntar 🗺️`,
    ja: (n) => `${n}さん、冒険の始まり 🗺️`,
    es: (n) => `${n}, tu aventura te espera 🗺️`,
  },
};

export function getGameModeAnnouncementSubject(
  mode: GameModeKey,
  language: string,
  recipientName: string,
): string {
  const table = ANNOUNCEMENT_SUBJECTS[mode] || ANNOUNCEMENT_SUBJECTS.blast;
  const fn = table[language] || table.en;
  return fn(recipientName);
}

/* ───────────────────────── Palette ───────────────────────── */

const C = {
  bg: '#1a1a2e',
  card: '#252545',
  cardInner: '#1e1e3a',
  border: '#000000',
  muted: '#9CA3AF',
  footer: '#666666',
  lime: '#A8E600',
  pink: '#FF1493',
  cyan: '#5CE0D6',
  purple: '#8B5CF6',
  white: '#FFFFFF',
  black: '#000000',
  grayDark: '#374151',
  grayLight: '#9CA3AF',
  urgencyBg: '#331030',
  urgencyBorder: '#6a2858',
} as const;

const ACCENT_HEX: Record<ModeAccent, string> = {
  lime: C.lime,
  pink: C.pink,
  cyan: C.cyan,
  purple: C.purple,
};

/* ───────────────────────── Component ───────────────────────── */

export default function GameModeAnnouncementEmail({
  recipientName,
  language,
  mode,
  unsubscribeUrl,
  playUrl,
}: GameModeAnnouncementEmailProps) {
  const preset = MODE_PRESETS[mode] || MODE_PRESETS.blast;
  const modeCopyForLang = MODE_COPY[mode] || MODE_COPY.blast;
  const t = modeCopyForLang[language] || modeCopyForLang.en;
  const accent = ACCENT_HEX[preset.accent];

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

                  {/* ── Text logo ── */}
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

                  {/* ── Main Card ── */}
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

                            {/* ── "NEW MODE" badge ── */}
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
                                          ✦ {preset.badgeLabel} ✦
                                        </span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                            {/* ── Mascot clipped circle ── */}
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
                                          src={preset.mascotUrl}
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

                            {/* ── Title ── */}
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

                            {/* ── Hero image ── */}
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
                                    src={preset.heroImageUrl}
                                    alt={preset.heroImageAlt}
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

                            {/* ── Personal intro ── */}
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

                            {/* ── Feature trio ── */}
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

                            {/* ── CTA ── */}
                            <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                              <tr>
                                <td align="center" style={{ paddingBottom: '18px' }}>
                                  <table role="presentation" cellPadding={0} cellSpacing={0}
                                    style={{ width: '100%', maxWidth: '340px', margin: '0 auto' }}>
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
                                            padding: '16px 32px',
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

                            {/* ── Urgency bar ── */}
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
                                        <span style={{ fontSize: '20px' }}>🎁</span>
                                      </td>
                                      <td valign="middle">
                                        <span
                                          style={{
                                            color: C.pink,
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

GameModeAnnouncementEmail.PreviewProps = {
  recipientName: 'Word Hunter',
  language: 'en',
  mode: 'blast',
  unsubscribeUrl: 'https://lexiclash.live/api/email/unsubscribe?token=test123',
  playUrl: 'https://lexiclash.live/en/blast',
} satisfies GameModeAnnouncementEmailProps;
