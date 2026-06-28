/**
 * Re-engagement Email v3 — Mascot-forward variant
 * Uses the new high-quality neo-brutalist mascot heroes (the ones that actually match the game images).
 * Supports heroVariant for different campaign angles (miss-you, comeback/streak, friends/social, tease/puzzle).
 *
 * Drop-in replacement or A/B variant for the existing reengagement flow.
 * Full 5-lang i18n + personalization like v2.
 */

import {
  Html, Head, Preview, Body, Heading, Text, Button, Link, Img, Tailwind, Font, pixelBasedPreset,
} from '@react-email/components';

interface Copy {
  greetingTail: string;
  caption: string;
  hint: string;
  pitch: string;
  cta: string;
  footerReason: string;
  unsubscribe: string;
  privacy: string;
  missedDays: (n: number) => string;
  solvedToday: (n: string) => string;
  hoursLeft: (h: number) => string;
}

const COPY: Record<string, Copy> = {
  en: {
    greetingTail: ', long time no spell.',
    caption: "Today's puzzle is live",
    hint: 'Starts with',
    pitch: "One word. 30 seconds. That's the whole thing.",
    cta: "Play today's word",
    footerReason: 'You signed up for daily word reminders.',
    unsubscribe: 'Unsubscribe',
    privacy: 'Privacy',
    missedDays: (n) => `${n} days off the grid — your comeback word is ready.`,
    solvedToday: (n) => `${n} players already cracked today's word`,
    hoursLeft: (h) => `${h}h left before it resets`,
  },
  he: {
    greetingTail: ', מתגעגעים אליך.',
    caption: 'החידה של היום עלתה',
    hint: 'מתחילה באות',
    pitch: 'מילה אחת. 30 שניות. וזהו.',
    cta: 'שחקו את המילה של היום',
    footerReason: 'נרשמת לתזכורות מילה יומית.',
    unsubscribe: 'ביטול הרשמה',
    privacy: 'פרטיות',
    missedDays: (n) => `${n} ימים בלי מילה — הניצחון הקל מחכה לך.`,
    solvedToday: (n) => `${n} שחקנים כבר פיצחו את המילה של היום`,
    hoursLeft: (h) => `עוד ${h} שעות והחידה מתאפסת`,
  },
  sv: {
    greetingTail: ', det var ett tag sen.',
    caption: 'Dagens pussel är ute',
    hint: 'Börjar på',
    pitch: 'Ett ord. 30 sekunder. Det är hela grejen.',
    cta: 'Spela dagens ord',
    footerReason: 'Du anmälde dig till dagliga ordpåminnelser.',
    unsubscribe: 'Avprenumerera',
    privacy: 'Integritet',
    missedDays: (n) => `${n} dagar utan ett ord — din lätta vinst väntar.`,
    solvedToday: (n) => `${n} spelare har redan löst dagens ord`,
    hoursLeft: (h) => `${h}h kvar innan det nollställs`,
  },
  ja: {
    greetingTail: 'さん、ひさしぶり。',
    caption: '今日のパズル、公開中',
    hint: '最初の文字は',
    pitch: '一単語、30秒。それだけ。',
    cta: '今日の単語で遊ぶ',
    footerReason: '毎日の単語リマインダーに登録してくれたよね。',
    unsubscribe: '配信停止',
    privacy: 'プライバシー',
    missedDays: (n) => `${n}日ぶり — かんたんな一勝が待ってるよ。`,
    solvedToday: (n) => `${n}人がもう今日の単語を解いたよ`,
    hoursLeft: (h) => `リセットまであと${h}時間`,
  },
  es: {
    greetingTail: ', cuánto tiempo.',
    caption: 'El reto de hoy ya está',
    hint: 'Empieza con',
    pitch: 'Una palabra. 30 segundos. Eso es todo.',
    cta: 'Jugar la palabra de hoy',
    footerReason: 'Te suscribiste a recordatorios diarios.',
    unsubscribe: 'Cancelar suscripción',
    privacy: 'Privacidad',
    missedDays: (n) => `${n} días sin una palabra — tu victoria fácil te espera.`,
    solvedToday: (n) => `${n} jugadores ya resolvieron la palabra de hoy`,
    hoursLeft: (h) => `${h}h antes de que se reinicie`,
  },
};

/** Subject lines tuned per heroVariant feel */
export const SUBJECT_LINES: Record<string, ((letter: string, name: string) => string)[]> = {
  en: [
    (l) => `ok but the first letter is "${l}"...`,
    (_l, n) => `${n}, it's been a minute`,
    (l) => `today's word starts with "${l}", that's all i'll say`,
    (l) => `30 seconds, one word, starts with "${l}"`,
    (_l, n) => `${n}, lexi kept your seat warm`,
  ],
  he: [
    (l) => `אוקיי אבל האות הראשונה היא "${l}"...`,
    (_l, n) => `${n}, עבר קצת זמן`,
    (l) => `המילה של היום מתחילה ב-"${l}", זה כל מה שאגלה`,
    (l) => `30 שניות, מילה אחת, מתחילה ב-"${l}"`,
    (_l, n) => `${n}, לקסי שמרה לך מקום`,
  ],
  sv: [
    (l) => `okej men första bokstaven är "${l}"...`,
    (_l, n) => `${n}, det var ett tag sen`,
    (l) => `dagens ord börjar på "${l}", mer säger jag inte`,
    (l) => `30 sekunder, ett ord, börjar på "${l}"`,
    (_l, n) => `${n}, lexi har sparat din plats`,
  ],
  ja: [
    (l) => `最初の文字「${l}」なんだけどさ...`,
    (_l, n) => `${n}さん、ちょっと久しぶりだね`,
    (l) => `今日の単語、「${l}」から始まるよ。ヒントはここまで`,
    (l) => `30秒、一単語、「${l}」で始まる`,
    (_l, n) => `${n}さん、レキシが席をとっておいたよ`,
  ],
  es: [
    (l) => `vale, la primera letra es "${l}"...`,
    (_l, n) => `${n}, ha pasado un rato`,
    (l) => `la palabra de hoy empieza con "${l}", no digo más`,
    (l) => `30 segundos, una palabra, empieza con "${l}"`,
    (_l, n) => `${n}, lexi te guardó el sitio`,
  ],
};

export function getReengagementSubjectV3(
  language: string,
  firstLetter: string,
  recipientName: string,
): string {
  const lines = SUBJECT_LINES[language] || SUBJECT_LINES['en'];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return lines[dayOfYear % lines.length](firstLetter, recipientName);
}

/* ─── Locale-aware number formatter (copied from v2 for consistency) ─── */
const LOCALE_TAG: Record<string, string> = {
  en: 'en-US',
  he: 'he-IL',
  sv: 'sv-SE',
  ja: 'ja-JP',
  es: 'es-ES',
};

function fmtNumber(n: number, language: string): string {
  try {
    return new Intl.NumberFormat(LOCALE_TAG[language] || 'en-US').format(n);
  } catch {
    return String(n);
  }
}

interface Props {
  recipientName: string;
  firstLetter: string;
  language?: string;
  playUrl: string;
  unsubscribeUrl: string;
  heroVariant?: 'miss-you' | 'comeback' | 'friends' | 'tease';
  wordLength?: number;
  daysSinceLastPlay?: number;
  playersToday?: number;
  hoursUntilReset?: number;
}

const HERO_MAP: Record<string, string> = {
  'miss-you': 'https://www.lexiclash.live/email/reengagement-heroes/reengagement-hero-mascot-miss-you.jpg',
  'comeback': 'https://www.lexiclash.live/email/reengagement-heroes/reengagement-hero-mascot-comeback.jpg',
  'friends': 'https://www.lexiclash.live/email/reengagement-heroes/reengagement-hero-mascot-friends.jpg',
  'tease': 'https://www.lexiclash.live/email/reengagement-heroes/reengagement-hero-mascot-tease.jpg',
};

export default function ReengagementMascotV3({
  recipientName,
  firstLetter,
  language = 'en',
  playUrl,
  unsubscribeUrl,
  heroVariant = 'miss-you',
  wordLength = 5,
  daysSinceLastPlay,
  playersToday,
  hoursUntilReset,
}: Props) {
  const t = COPY[language] || COPY.en;
  const rtl = language === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const sh = rtl ? '-' : '';
  const startAlign: 'left' | 'right' = rtl ? 'right' : 'left';
  const heroSrc = HERO_MAP[heroVariant] || HERO_MAP['miss-you'];

  const totalTiles = Math.max(3, Math.min(7, wordLength));
  const blankTiles = Array.from({ length: totalTiles - 1 });

  const showMissedDays = typeof daysSinceLastPlay === 'number' && daysSinceLastPlay >= 7;
  const showSolvedToday = typeof playersToday === 'number' && playersToday >= 50;
  const showHoursLeft = typeof hoursUntilReset === 'number' && hoursUntilReset > 0 && hoursUntilReset < 12;
  const showStats = showSolvedToday || showHoursLeft;

  return (
    <Html lang={language} dir={dir}>
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head>
          <Font fontFamily="Fredoka" fallbackFontFamily="Arial" webFont={{ url: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap', format: 'woff2' }} />
          <meta name="color-scheme" content="dark" />
        </Head>
        <Body className="body-v3" style={{ margin: 0, padding: 0, backgroundColor: '#1a1a2e', fontFamily: "'Fredoka', system-ui, sans-serif" }}>
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" dir={dir} style={{ backgroundColor: '#1a1a2e' }}>
            <tr>
              <td align="center" style={{ padding: '32px 16px' }}>
                <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ maxWidth: '540px' }} dir={dir}>

                  {/* Hero using new mascot image */}
                  <tr>
                    <td align="center" style={{ paddingBottom: '16px' }}>
                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ border: '4px solid #000', borderRadius: '18px', overflow: 'hidden', boxShadow: `${sh}6px 6px 0 #000`, backgroundColor: '#252545' }}>
                        <tr>
                          <td style={{ padding: 0, lineHeight: 0 }}>
                            <Link href={playUrl} style={{ display: 'block' }}>
                              <Img src={heroSrc} width="100%" alt="LexiClash re-engagement" style={{ display: 'block', width: '100%', border: 0 }} />
                            </Link>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* Greeting + optional missed days chip */}
                  <tr>
                    <td style={{ padding: '0 20px 12px', textAlign: startAlign }}>
                      <Heading as="h1" style={{ color: '#fff', fontSize: '24px', margin: 0, fontWeight: 700, textAlign: startAlign }}>
                        <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{recipientName}</span>{t.greetingTail}
                      </Heading>
                    </td>
                  </tr>

                  {showMissedDays && (
                    <tr>
                      <td style={{ padding: '0 20px 16px', textAlign: startAlign }}>
                        <div style={{ display: 'inline-block', backgroundColor: '#FF1493', color: '#000', fontSize: '12px', fontWeight: 700, padding: '6px 14px', borderRadius: '999px', border: '3px solid #000', boxShadow: `${sh}3px 3px 0 #000` }}>
                          {t.missedDays(daysSinceLastPlay as number)}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Hint + tiles */}
                  <tr>
                    <td style={{ padding: '0 20px 8px', textAlign: startAlign }}>
                      <Text style={{ color: '#A1A1B5', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, margin: 0 }}>
                        {t.hint}
                      </Text>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ padding: '0 20px 16px' }}>
                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ backgroundColor: '#0f0f22', border: '3px solid #000', borderRadius: '14px' }}>
                        <tr>
                          <td align="center" style={{ padding: '16px 10px' }}>
                            <table role="presentation" cellPadding={0} cellSpacing={0} dir={dir}>
                              <tr>
                                <td width={42} height={52} align="center" valign="middle" style={{ backgroundColor: '#5CE0D6', border: '4px solid #000', borderRadius: '10px', boxShadow: `${sh}3px 3px 0 #000`, fontSize: '22px', fontWeight: 700, color: '#000' }}>
                                  {firstLetter}
                                </td>
                                {blankTiles.flatMap((_, i) => [
                                  <td key={`gap-${i}`} width={5}>&nbsp;</td>,
                                  <td key={`tile-${i}`} width={42} height={52} align="center" valign="middle" style={{ backgroundColor: '#14142b', border: '4px solid #000', borderRadius: '10px', boxShadow: `${sh}3px 3px 0 #000` }}>&nbsp;</td>
                                ])}
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ padding: '0 20px 12px', textAlign: startAlign }}>
                      <Text style={{ color: '#fff', fontSize: '15px', fontWeight: 500, lineHeight: '1.5', margin: 0 }}>
                        {t.pitch}
                      </Text>
                    </td>
                  </tr>

                  {showStats && (
                    <tr>
                      <td style={{ padding: '0 20px 16px', textAlign: startAlign }}>
                        <Text style={{ color: '#A1A1B5', fontSize: '13px', fontWeight: 600, margin: 0 }}>
                          {showSolvedToday && <span style={{ color: '#A8E600' }}>{t.solvedToday(fmtNumber(playersToday as number, language))}</span>}
                          {showSolvedToday && showHoursLeft && ' · '}
                          {showHoursLeft && <span style={{ color: '#FF1493' }}>{t.hoursLeft(hoursUntilReset as number)}</span>}
                        </Text>
                      </td>
                    </tr>
                  )}

                  {/* CTA */}
                  <tr>
                    <td style={{ padding: '0 20px 24px' }}>
                      <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ backgroundColor: '#A8E600', border: '3px solid #000', borderRadius: '14px', boxShadow: `${sh}5px 5px 0 #000` }}>
                        <tr>
                          <td align="center">
                            <Button href={playUrl} style={{ display: 'block', color: '#000', fontSize: '17px', fontWeight: 700, textDecoration: 'none', padding: '14px 24px', borderRadius: '12px' }}>
                              {t.cta} →
                            </Button>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  {/* Footer */}
                  <tr>
                    <td style={{ padding: '0 20px 8px', textAlign: 'center' }}>
                      <Text style={{ color: '#6b6b85', fontSize: '12px', margin: '0 0 8px' }}>{t.footerReason}</Text>
                      <Text style={{ color: '#6b6b85', fontSize: '11px', margin: 0 }}>
                        <Link href={unsubscribeUrl} style={{ color: '#A1A1B5', textDecoration: 'underline' }}>{t.unsubscribe}</Link>
                        {' · '}
                        <Link href={playUrl} style={{ color: '#A1A1B5', textDecoration: 'underline' }}>LexiClash</Link>
                        {' · '}
                        <Link href={`https://lexiclash.live/${language === 'en' ? 'en' : language}/privacy`} style={{ color: '#A1A1B5', textDecoration: 'underline' }}>{t.privacy}</Link>
                      </Text>
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

ReengagementMascotV3.PreviewProps = {
  recipientName: 'Word Hunter',
  firstLetter: 'K',
  language: 'en',
  playUrl: 'https://lexiclash.live/en/daily',
  unsubscribeUrl: 'https://lexiclash.live/unsub',
  heroVariant: 'comeback',
  wordLength: 5,
  daysSinceLastPlay: 12,
  playersToday: 1847,
  hoursUntilReset: 5,
} satisfies Props;
