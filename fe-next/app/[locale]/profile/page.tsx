
import { Suspense } from 'react';
import ProfilePageClient from './PageClient';

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 bg-neo-navy min-h-screen flex items-center justify-center">
        <div className="animate-pulse bg-neo-navy/50 rounded-neo p-8 w-full max-w-md">
          <div className="h-20 w-20 rounded-full bg-neo-white/10 mx-auto mb-4" />
          <div className="h-4 bg-neo-white/10 rounded mb-3 w-3/4 mx-auto" />
          <div className="h-4 bg-neo-white/10 rounded w-1/2 mx-auto" />
        </div>
      </div>
    }>
      <ProfilePageClient />
    </Suspense>
  );
}
