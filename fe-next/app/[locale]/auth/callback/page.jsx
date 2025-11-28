'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // For implicit flow, tokens are in the URL hash fragment
        // Supabase client will automatically detect and process them
        if (supabase) {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Auth callback error:', error);
            router.replace('/?auth_error=true');
            return;
          }

          if (data.session) {
            // Successfully authenticated
            router.replace('/');
            return;
          }
        }

        // If no session yet, the URL might have a code for PKCE flow
        // Let Supabase handle it via detectSessionInUrl
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (accessToken && supabase) {
          // Wait a moment for Supabase to process the hash
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            router.replace('/');
            return;
          }
        }

        // Fallback: redirect to home with error
        router.replace('/?auth_error=true');
      } catch (err) {
        console.error('Auth callback exception:', err);
        router.replace('/?auth_error=true');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-white text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}
