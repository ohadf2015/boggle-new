import Link from 'next/link';
import { headers } from 'next/headers';

function detectLocaleFromPath(pathname: string): string {
  const match = pathname.match(/^\/(he|en|sv|ja|es)\b/);
  return match?.[1] || 'en';
}

const notFoundTranslations: Record<string, { title: string; description: string; cta: string }> = {
  en: { title: 'Page Not Found', description: "The page you're looking for doesn't exist or has been moved.", cta: 'Back to Game' },
  he: { title: 'הדף לא נמצא', description: 'הדף שחיפשת לא קיים או שהועבר.', cta: 'חזרה למשחק' },
  sv: { title: 'Sidan hittades inte', description: 'Sidan du letar efter finns inte eller har flyttats.', cta: 'Tillbaka till spelet' },
  ja: { title: 'ページが見つかりません', description: 'お探しのページは存在しないか、移動されました。', cta: 'ゲームに戻る' },
  es: { title: 'Página no encontrada', description: 'La página que buscas no existe o ha sido movida.', cta: 'Volver al juego' },
};

export default async function GlobalNotFound() {
  const headersList = await headers();
  const pathname = headersList.get('x-next-url') || headersList.get('x-invoke-path') || '/en';
  const locale = detectLocaleFromPath(pathname);
  const isRTL = locale === 'he';
  const t = notFoundTranslations[locale] || notFoundTranslations.en;

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <body className="bg-neo-navy">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div aria-hidden="true" className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
              404
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t.title}
            </h2>
            <p className="text-gray-600 mb-6">
              {t.description}
            </p>
            <Link
              href={`/${locale}`}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition-all"
            >
              {t.cta}
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
