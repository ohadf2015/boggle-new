import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Daily Word Wheel - LexiClash';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TITLES: Record<string, string> = {
  en: 'Daily Word Wheel',
  he: 'לגלג םילימ ימוי', // reversed for Satori RTL
  sv: 'Dagligt Ordhjul',
  ja: 'デイリーワードホイール',
  es: 'Rueda de Palabras Diaria',
  ru: 'Ежедневное колесо слов',
};

const SUBTITLES: Record<string, string> = {
  en: 'Free Daily Word Puzzle',
  he: 'ימוי םילימ לזאפ', // reversed
  sv: 'Gratis Dagligt Ordpussel',
  ja: '毎日の無料ワードパズル',
  es: 'Puzzle de Palabras Diario Gratis',
  ru: 'Бесплатная ежедневная головоломка со словами',
};

const TAGLINES: Record<string, string> = {
  en: 'New puzzle every day • Compete globally',
  he: 'תימלוע ורחתה • םוי לכ שדח לזאפ', // reversed
  sv: 'Nytt pussel varje dag • Tävla globalt',
  ja: '毎日新しいパズル • 世界と競争',
  es: 'Nuevo puzzle cada día • Compite globalmente',
  ru: 'Новая головоломка каждый день • Соревнуйтесь во всём мире',
};

export default async function OGImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = ['en', 'he', 'sv', 'ja', 'es', 'ru'].includes(locale) ? locale : 'en';

  const title = TITLES[lang] || TITLES.en;
  const subtitle = SUBTITLES[lang] || SUBTITLES.en;
  const tagline = TAGLINES[lang] || TAGLINES.en;

  // Word wheel letters for decoration
  const outerLetters = ['W', 'O', 'R', 'D', 'S', '!'];
  const centerLetter = '⭐';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left side — text content */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '40px' }}>
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                background: 'rgba(191,255,0,0.15)',
                border: '2px solid rgba(191,255,0,0.4)',
                borderRadius: '24px',
                padding: '6px 20px',
                fontSize: '18px',
                fontWeight: 700,
                color: '#BFFF00',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '56px',
              fontWeight: 900,
              color: '#FFFEF0',
              lineHeight: 1.1,
              marginBottom: '20px',
            }}
          >
            {title}
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '22px',
              color: 'rgba(255,254,240,0.6)',
              marginBottom: '32px',
            }}
          >
            {tagline}
          </div>

          {/* LexiClash branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: '#BFFF00',
              }}
            >
              Lexi
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: '#00FFFF',
              }}
            >
              Clash
            </div>
          </div>
        </div>

        {/* Right side — word wheel visual */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '320px',
            height: '320px',
            position: 'relative',
          }}
        >
          {/* Outer glow ring */}
          <div
            style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              borderRadius: '150px',
              border: '3px solid rgba(191,255,0,0.2)',
              boxShadow: '0 0 60px rgba(191,255,0,0.15), inset 0 0 60px rgba(191,255,0,0.05)',
            }}
          />

          {/* Center letter */}
          <div
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '45px',
              background: '#BFFF00',
              border: '4px solid #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              fontWeight: 900,
              color: '#1a1a2e',
              boxShadow: '4px 4px 0px #000, 0 0 30px rgba(191,255,0,0.5)',
            }}
          >
            {centerLetter}
          </div>

          {/* Outer letters positioned in a circle */}
          {outerLetters.map((letter, i) => {
            const angle = i * 60;
            const rad = (angle * Math.PI) / 180;
            const r = 120;
            const x = Math.sin(rad) * r;
            const y = -Math.cos(rad) * r;
            return (
              <div
                key={`${letter}-${i}`}
                style={{
                  position: 'absolute',
                  left: `${160 + x - 28}px`,
                  top: `${160 + y - 28}px`,
                  width: '56px',
                  height: '56px',
                  borderRadius: '28px',
                  background: '#FFFEF0',
                  border: '3px solid #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#1a1a2e',
                  boxShadow: '3px 3px 0px #000',
                }}
              >
                {letter}
              </div>
            );
          })}
        </div>
      </div>
    ),
    { ...size },
  );
}
