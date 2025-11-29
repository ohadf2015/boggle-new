'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">😵</div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Something went wrong!
        </h2>
        <p className="text-gray-400 mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2 rounded-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-5 py-2 rounded-lg font-bold border border-slate-600 text-gray-300 hover:bg-slate-700 transition-all"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
