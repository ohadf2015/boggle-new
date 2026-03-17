import Link from 'next/link';
import { headers } from 'next/headers';

function detectLocaleFromPath(pathname: string): string {
  const match = pathname.match(/^\/(he|en|sv|ja|es)\b/);
  return match?.[1] || 'en';
}

export default async function GlobalNotFound() {
  const headersList = await headers();
  const pathname = headersList.get('x-next-url') || headersList.get('x-invoke-path') || '/en';
  const locale = detectLocaleFromPath(pathname);
  const isRTL = locale === 'he';

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <body className="bg-neo-navy">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
              404
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Page Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <Link
              href={`/${locale}`}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium transition-all"
            >
              Back to Game
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
