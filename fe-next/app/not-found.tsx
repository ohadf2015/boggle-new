import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
              404
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Page Not Found
            </h2>
            <p className="text-gray-400 mb-6">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <Link
              href="/"
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
