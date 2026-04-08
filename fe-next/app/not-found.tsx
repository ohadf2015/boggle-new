import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { headers } from 'next/headers';

export const metadata: Metadata = {
  title: '404 - Page Not Found | LexiClash',
  robots: { index: false, follow: false },
};

function detectLocaleFromPath(pathname: string): string {
  const match = pathname.match(/^\/(he|en|sv|ja|es)\b/);
  return match?.[1] || 'en';
}

const notFoundTranslations: Record<string, {
  title: string;
  subtitle: string;
  description: string;
  hint: string;
  cta: string;
}> = {
  en: {
    title: 'Oops! Off the Board!',
    subtitle: "This word doesn't exist in our dictionary.",
    description: "Looks like you wandered off the grid. Even our mascot can't find this page — and they've explored everywhere!",
    hint: '(Psst... maybe try a real word next time)',
    cta: 'Back to the Game',
  },
  he: {
    title: '!אופס! מחוץ ללוח',
    subtitle: 'המילה הזו לא קיימת במילון שלנו.',
    description: 'נראה שיצאת מהלוח. גם הקמע שלנו לא מצליח למצוא את הדף הזה — והוא כבר חיפש בכל מקום!',
    hint: '(פסט... אולי תנסו מילה אמיתית בפעם הבאה)',
    cta: 'חזרה למשחק',
  },
  sv: {
    title: 'Hoppsan! Utanför brädet!',
    subtitle: 'Det här ordet finns inte i vår ordbok.',
    description: 'Det verkar som att du hamnat utanför rutnätet. Inte ens vår maskot hittar den här sidan — och den har letat överallt!',
    hint: '(Psst... kanske prova ett riktigt ord nästa gång)',
    cta: 'Tillbaka till spelet',
  },
  ja: {
    title: 'おっと！盤外です！',
    subtitle: 'この単語は辞書にありません。',
    description: 'グリッドの外に出てしまったようです。マスコットでさえこのページを見つけられません — どこでも探したのに！',
    hint: '（ヒント：次は本当の単語を試してみて）',
    cta: 'ゲームに戻る',
  },
  es: {
    title: '¡Ups! ¡Fuera del tablero!',
    subtitle: 'Esta palabra no existe en nuestro diccionario.',
    description: '¡Parece que te saliste del tablero! Ni siquiera nuestra mascota puede encontrar esta página — ¡y ya exploró todo!',
    hint: '(Psst... quizás intenta una palabra real la próxima vez)',
    cta: 'Volver al juego',
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
  const pathname = headersList.get('x-next-url') || headersList.get('x-invoke-path') || '/en';
  const locale = detectLocaleFromPath(pathname);
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
                  key={i}
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
                {locale === 'he' ? '?!איפה אני' :
                 locale === 'ja' ? 'ここどこ？！' :
                 locale === 'sv' ? 'Var är jag?!' :
                 locale === 'es' ? '¿¡Dónde estoy?!' :
                 'Where am I?!'}
                <div className={`absolute bottom-[-6px] ${isRTL ? 'left-4' : 'right-4'}
                  w-3 h-3 bg-neo-cream border-b-2 border-r-2 border-black
                  transform rotate-45`}
                />
              </div>
            </div>

            {/* Copy */}
            <h1 className="text-2xl sm:text-3xl font-neo-display font-bold text-neo-cream mb-2">
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
