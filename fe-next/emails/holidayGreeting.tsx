import { Html, Head, Preview, Body, Img, Font } from '@react-email/components';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { LOGO_IMAGE_EN, LOGO_IMAGE_HE } from './androidReleaseLaunch';
import { asHolidayEmailLanguage, getHolidayGreetingStrings } from './holidayGreeting.strings';

export interface HolidayGreetingEmailProps {
  holiday: HolidayKey;
  language: string;
  recipientName: string;
  unsubscribeUrl: string;
}

export const HOLIDAY_SITE = 'https://www.lexiclash.live';

export function holidayHeroImage(holiday: HolidayKey): string {
  return `${HOLIDAY_SITE}/holidays/email-${holiday}.png`;
}

export function holidayCtaUrl(language: string, holiday: HolidayKey): string {
  return `${HOLIDAY_SITE}/${asHolidayEmailLanguage(language)}?utm_source=email&utm_campaign=holiday-${holiday}-2026`;
}

export function getHolidayGreetingSubject(language: string, holiday: HolidayKey, name: string): string {
  return getHolidayGreetingStrings(language, holiday).subject(name);
}

const C = {
  bg: '#1a1a2e',
  card: '#16213e',
  lime: '#BFFF00',
  cyan: '#00FFFF',
  pink: '#FF1493',
  gold: '#FFD23F',
  black: '#000000',
  white: '#FFFFFF',
  cream: '#FFFEF0',
  muted: '#94A3B8',
};

const ACCENTS: Record<HolidayKey, [string, string, string]> = {
  hanukkah: [C.cyan, C.gold, C.cyan],
  christmas: [C.pink, C.lime, C.pink],
};

const FONT_STACK = "'Fredoka','Rubik','Segoe UI',Helvetica,Arial,sans-serif";

export default function HolidayGreetingEmail({ holiday, language, recipientName, unsubscribeUrl }: HolidayGreetingEmailProps) {
  const lang = asHolidayEmailLanguage(language);
  const t = getHolidayGreetingStrings(lang, holiday);
  const rtl = lang === 'he';
  const dir = rtl ? 'rtl' : 'ltr';
  const sh = rtl ? '-' : '';
  const accents = ACCENTS[holiday];

  return (
    <Html lang={lang} dir={dir}>
      <Head>
        <Font
          fontFamily="Fredoka"
          fallbackFontFamily="Arial"
          webFont={{ url: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap', format: 'woff2' }}
        />
        <Font
          fontFamily="Rubik"
          fallbackFontFamily="Helvetica"
          webFont={{ url: 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap', format: 'woff2' }}
        />
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        <style>{`
          u + .body { background-color: ${C.bg} !important; }
          @media (max-width: 480px) {
            .h1 { font-size: 28px !important; }
            .card-pad { padding: 24px 20px !important; }
          }
        `}</style>
      </Head>
      <Preview>{t.preview}</Preview>
      <Body className="body" style={{ margin: 0, padding: 0, backgroundColor: C.bg, fontFamily: FONT_STACK }}>
        <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" dir={dir} style={{ backgroundColor: C.bg }}>
          <tr>
            <td align="center" style={{ padding: '32px 20px' }}>
              <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" dir={dir} style={{ maxWidth: '600px' }}>
                <tr>
                  <td align="center" style={{ paddingBottom: '22px' }}>
                    <Img
                      src={rtl ? LOGO_IMAGE_HE : LOGO_IMAGE_EN}
                      alt="LexiClash"
                      width="184"
                      style={{ display: 'inline-block', width: '184px', maxWidth: '62%', height: 'auto', border: 0 }}
                    />
                  </td>
                </tr>
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
                      <tr>
                        <td style={{ padding: 0, fontSize: 0, lineHeight: 0 }}>
                          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%">
                            <tr>
                              {accents.map((color, i) => (
                                <td key={i} width="33%" height="8" style={{ backgroundColor: color }} />
                              ))}
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: 0, fontSize: 0, lineHeight: 0 }}>
                          <Img
                            src={holidayHeroImage(holiday)}
                            alt={t.headline}
                            width="600"
                            style={{ display: 'block', width: '100%', maxWidth: '600px', height: 'auto', border: 0 }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="card-pad" align="center" style={{ padding: '32px 36px 36px' }}>
                          <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 auto 18px' }}>
                            <tr>
                              <td
                                style={{
                                  backgroundColor: C.cream,
                                  color: C.black,
                                  border: `3px solid ${C.black}`,
                                  borderRadius: '9999px',
                                  boxShadow: `${sh}3px 3px 0px ${C.black}`,
                                  padding: '7px 18px',
                                  fontFamily: FONT_STACK,
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  letterSpacing: '1.5px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {t.badge}
                              </td>
                            </tr>
                          </table>
                          <h1
                            className="h1"
                            style={{ margin: '0 0 14px', fontFamily: FONT_STACK, fontSize: '36px', lineHeight: 1.1, fontWeight: 700, color: C.white }}
                          >
                            {t.headline}
                          </h1>
                          <p
                            style={{ margin: '0 0 28px', fontFamily: FONT_STACK, fontSize: '16px', lineHeight: 1.6, color: C.cream }}
                          >
                            {t.body}
                          </p>
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
                                  href={holidayCtaUrl(lang, holiday)}
                                  style={{
                                    display: 'block',
                                    padding: '15px 32px',
                                    fontFamily: FONT_STACK,
                                    fontSize: '18px',
                                    fontWeight: 700,
                                    color: C.black,
                                    textDecoration: 'none',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {t.cta}
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style={{ padding: '24px 16px 8px' }}>
                    <p style={{ margin: '0 0 6px', fontFamily: FONT_STACK, fontSize: '13px', color: C.muted }}>
                      {recipientName ? `${recipientName}: ` : ''}
                      {t.footer}
                    </p>
                    <a href={unsubscribeUrl} style={{ fontFamily: FONT_STACK, fontSize: '12px', color: C.muted, textDecoration: 'underline' }}>
                      {t.unsubscribe}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Body>
    </Html>
  );
}

HolidayGreetingEmail.PreviewProps = {
  holiday: 'hanukkah',
  language: 'en',
  recipientName: 'Word Hunter',
  unsubscribeUrl: 'https://www.lexiclash.live/api/email/unsubscribe?token=test123',
} satisfies HolidayGreetingEmailProps;
