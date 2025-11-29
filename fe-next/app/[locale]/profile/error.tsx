'use client';

import { useEffect } from 'react';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Profile error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="mx-auto text-6xl text-gray-600 mb-4">👤</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Failed to load profile
          </h2>
          <p className="text-gray-400 mb-6">
            {error.message || 'Unable to load your profile. Please try again.'}
          </p>
          <button
            onClick={reset}
            className="px-5 py-2 rounded-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all inline-flex items-center gap-2"
          >
            🔄 Try again
          </button>
        </div>
      </div>
    </div>
  );
}
