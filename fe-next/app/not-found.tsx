import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { headers, cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '404 - Page Not Found | LexiClash',
  robots: { index: false, follow: false },
};

const SUPPORTED_LOCALES = ['he', 'en', 'sv', 'ja', 'es'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function detectLocaleFromPath(pathname: string): SupportedLocale | null {
  const match = pathname.match(/^\/(he|en|sv|ja|es)\b/);
  return (match?.[1] as SupportedLocale) || null;
}

function detectLocaleFromAcceptLang(header: string | null): SupportedLocale | null {
  if (!header) return null;
  const langs = header.split(',').map((s) => s.trim().split(';')[0].toLowerCase());
  for (const l of langs) {
    const base = l.split('-')[0];
    if ((SUPPORTED_LOCALES as readonly string[]).includes(base)) return base as SupportedLocale;
  }
  return null;
}

const notFoundTranslations: Record<string, {
  title: string;
  subtitle: string;
  description: string;
  hint: string;
  cta: string;
}> = {
  en: {
    title: '404 — Word Not Found!',
    subtitle: '"404" scored 0 points. Not a valid word.',
    description: "You tried to spell a page that doesn't exist. Classic triple-letter blunder. Even our mascot checked the dictionary twice.",
    hint: '(Fun fact: 404 would be worth 8 points in Scrabble — if it were a word. It\'s not.)',
    cta: 'Back to the Board',
  },
  he: {
    title: '!404 — מילה לא נמצאה',
    subtitle: '.נקודות. לא מילה חוקית 0 קיבלה "404"',
    description: 'ניסית לאיית דף שלא קיים. טעות קלאסית של משבצת כפולה. גם הקמע שלנו בדק במילון פעמיים.',
    hint: '(עובדה מהנה: 404 הייתה שווה 8 נקודות בסקרבל — אם זו הייתה מילה. היא לא.)',
    cta: 'חזרה ללוח',
  },
  sv: {
    title: '404 — Ordet hittades inte!',
    subtitle: '"404" gav 0 poäng. Inte ett giltigt ord.',
    description: 'Du försökte stava en sida som inte finns. Klassisk trippelbokstavs-tabbe. Vår maskot kollade ordboken två gånger.',
    hint: '(Kul fakta: 404 skulle vara värt 8 poäng i Scrabble — om det vore ett ord. Det är det inte.)',
    cta: 'Tillbaka till brädet',
  },
  ja: {
    title: '404 — 単語が見つかりません！',
    subtitle: '「404」は0ポイント。有効な単語ではありません。',
    description: '存在しないページを綴ろうとしました。典型的なトリプルレターの失敗。マスコットも辞書を二度確認しました。',
    hint: '（豆知識：404はスクラブルで8点の価値がある — もし単語だったら。違うけど。）',
    cta: 'ボードに戻る',
  },
  es: {
    title: '404 — ¡Palabra no encontrada!',
    subtitle: '"404" obtuvo 0 puntos. No es una palabra válida.',
    description: 'Intentaste deletrear una página que no existe. Error clásico de casilla triple. Hasta nuestra mascota revisó el diccionario dos veces.',
    hint: '(Dato curioso: 404 valdría 8 puntos en Scrabble — si fuera una palabra. No lo es.)',
    cta: 'Volver al tablero',
  },
};

/* Scattered letter tiles that spell "404" with decorative noise.
   Colors use full class names so Tailwind can detect them at build time. */
const TILES = [
  { letter: '4', rotate: -12, x: -100, y: -20, bg: 'bg-neo-cyan', delay: '0s' },
  { letter: '0', rotate: 6, x: 0, y: -35, bg: 'bg-neo-pink', delay: '0.1s' },
  { letter: '4', rotate: 15, x: 100, y: -15, bg: 'bg-neo-lime', delay: '0.2s' },
  /* noise tiles */
  { letter: '?', rotate: -25, x: -160, y: 30, bg: 'bg-neo-purple', delay: '0.3s' },
  { letter: '!', rotate: 20, x: 165, y: 40, bg: 'bg-neo-purple', delay: '0.4s' },
];

export default async function GlobalNotFound() {
  const headersList = await headers();
  const cookieStore = await cookies();
  const pathname = headersList.get('x-next-url') || headersList.get('x-invoke-path') || '';
  const cookieLang = cookieStore.get('boggle_language')?.value;
  const cookieLocale = cookieLang && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLang)
    ? (cookieLang as SupportedLocale)
    : null;
  const locale: SupportedLocale =
    detectLocaleFromPath(pathname) ||
    cookieLocale ||
    detectLocaleFromAcceptLang(headersList.get('accept-language')) ||
    'en';
  const isRTL = locale === 'he';
  const t = notFoundTranslations[locale] || notFoundTranslations.en;

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <body className="bg-neo-navy texture-halftone">
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
          <div className="text-center max-w-lg">

            {/* Scattered letter tiles */}
            <div className="relative h-32 sm:h-40 mb-4 flex items-center justify-center" aria-hidden="true">
              {TILES.map((tile, i) => (
                <div
                  key={`tile-${i}-${tile.letter}`}
                  className={`absolute font-neo-display text-4xl sm:text-5xl font-bold
                    ${tile.bg} text-neo-navy
                    w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center
                    border-neo-thick rounded-neo shadow-hard-lg
                    animate-neo-pop`}
                  style={{
                    transform: `translate(${tile.x}px, ${tile.y}px) rotate(${tile.rotate}deg)`,
                    animationDelay: tile.delay,
                    animationFillMode: 'both',
                  }}
                >
                  {tile.letter}
                </div>
              ))}
            </div>

            {/* Score rejection */}
            <div className="text-neo-red font-black text-lg sm:text-xl font-neo-display tracking-wider mb-4 animate-neo-shake" style={{ animationIterationCount: '1' }}>
              <span className="line-through decoration-neo-red decoration-4">0 pts</span>
              {' — '}
              <span className="text-gray-400 text-sm font-neo-body">
                {locale === 'he' ? 'לא במילון' :
                 locale === 'ja' ? '辞書にない' :
                 locale === 'sv' ? 'inte i ordboken' :
                 locale === 'es' ? 'no en el diccionario' :
                 'not in dictionary'}
              </span>
            </div>

            {/* Mascot */}
            <div className="relative mx-auto w-40 h-40 sm:w-52 sm:h-52 mb-6">
              <div className="animate-neo-wobble">
                <Image
                  src="/mascot-new-explorer.jpg"
                  alt="LexiClash mascot looking lost"
                  width={208}
                  height={208}
                  className="rounded-2xl border-neo-thick shadow-hard-lg"
                  priority
                />
              </div>
              {/* Speech bubble */}
              <div
                className={`absolute -top-3 ${isRTL ? '-left-2 sm:-left-6' : '-right-2 sm:-right-6'}
                  bg-neo-cream text-neo-navy text-xs sm:text-sm font-neo-body font-semibold
                  px-3 py-1.5 rounded-xl border-neo shadow-hard
                  animate-neo-pop max-w-[140px]`}
                style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
              >
                {locale === 'he' ? '!זו לא מילה' :
                 locale === 'ja' ? 'それ単語じゃない！' :
                 locale === 'sv' ? 'Det är inget ord!' :
                 locale === 'es' ? '¡Eso no es palabra!' :
                 "That's not a word!"}
                <div className={`absolute bottom-[-6px] ${isRTL ? 'left-4' : 'right-4'}
                  w-3 h-3 bg-neo-cream border-b-2 border-r-2 border-black
                  transform rotate-45`}
                />
              </div>
            </div>

            {/* Copy */}
            <h1 className="text-2xl sm:text-3xl font-neo-display font-bold text-neo-white mb-2">
              {t.title}
            </h1>
            <p className="text-lg sm:text-xl font-neo-display text-neo-cyan mb-2">
              {t.subtitle}
            </p>
            <p className="text-sm sm:text-base text-gray-400 font-neo-body mb-2 max-w-sm mx-auto">
              {t.description}
            </p>
            <p className="text-xs text-gray-500 font-neo-body italic mb-8">
              {t.hint}
            </p>

            {/* CTA */}
            <Link
              href={`/${locale}`}
              className="inline-flex items-center justify-center gap-2
                px-8 py-3.5 rounded-neo
                bg-neo-lime text-neo-navy
                font-neo-display font-bold text-lg
                border-neo-thick shadow-hard-lg
                hover:shadow-hard-pressed hover:translate-x-[2px] hover:translate-y-[2px]
                active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
                transition-all duration-150"
            >
              {t.cta}
            </Link>

            {/* Error code for devs */}
            <p className="mt-10 text-[10px] text-gray-600 font-mono tracking-widest uppercase">
              Error 404 &middot; Page not found
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
