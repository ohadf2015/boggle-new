'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    // Prevent double-handling
    if (hasHandledCallback.current) return;
    hasHandledCallback.current = true;

    const handleCallback = async () => {
      try {
        if (!supabase) {
          logger.error('Supabase not configured');
          router.replace('/?auth_error=true');
          return;
        }

        // Check for PKCE code in query params (from server redirect)
        const code = searchParams.get('code');
        const next = searchParams.get('next') || '/';

        if (code) {
          logger.log('Auth callback: Exchanging code for session');
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            logger.error('Auth callback: Code exchange error:', error);
            router.replace('/?auth_error=true');
            return;
          }

          // Successfully exchanged code - get session to confirm
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            logger.log('Auth callback: Session established successfully');
            router.replace(next);
            return;
          }
        }

        // Check for existing session (might have been set by detectSessionInUrl)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          logger.error('Auth callback error:', error);
          router.replace('/?auth_error=true');
          return;
        }

        if (data.session) {
          // Successfully authenticated
          logger.log('Auth callback: Found existing session');
          router.replace('/');
          return;
        }

        // Check for implicit flow tokens in hash fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (accessToken) {
          // Wait a moment for Supabase to process the hash
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: hashData } = await supabase.auth.getSession();
          if (hashData.session) {
            logger.log('Auth callback: Session from hash tokens');
            router.replace('/');
            return;
          }
        }

        // Fallback: redirect to home with error
        logger.warn('Auth callback: No session found, redirecting with error');
        router.replace('/?auth_error=true');
      } catch (err) {
        logger.error('Auth callback exception:', err);
        router.replace('/?auth_error=true');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-white text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}
