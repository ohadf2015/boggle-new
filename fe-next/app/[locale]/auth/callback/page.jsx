'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { defaultLocale } from '@/lib/i18n';

// Loading UI component
function LoadingUI() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-white text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}

// Inner component that uses useSearchParams - must be wrapped in Suspense
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const hasHandledCallback = useRef(false);

  // Get locale from URL params, fallback to default
  const locale = params?.locale || defaultLocale;

  useEffect(() => {
    // Prevent double-handling
    if (hasHandledCallback.current) return;
    hasHandledCallback.current = true;

    const handleCallback = async () => {
      try {
        if (!supabase) {
          logger.error('Supabase not configured');
          router.replace(`/${locale}?auth_error=true`);
          return;
        }

        // Ensure next URL has locale prefix
        let next = searchParams.get('next') || `/${locale}`;
        if (next === '/') {
          next = `/${locale}`;
        }

        // IMPORTANT: Check for existing session FIRST
        // Supabase's detectSessionInUrl may have already exchanged the code
        // before this component mounted. Checking session first prevents
        // double-exchange errors.
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session) {
          logger.log('Auth callback: Session already exists, redirecting');
          router.replace(next);
          return;
        }

        // Check for PKCE code in query params (from server redirect)
        const code = searchParams.get('code');

        if (code) {
          logger.log('Auth callback: Exchanging code for session');
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            // Check if error is because code was already used (by detectSessionInUrl)
            // In this case, try to get session again as it might have been set
            if (error.message?.includes('code') || error.message?.includes('expired') || error.message?.includes('invalid')) {
              logger.warn('Auth callback: Code exchange failed, checking for existing session');
              const { data: retrySession } = await supabase.auth.getSession();
              if (retrySession?.session) {
                logger.log('Auth callback: Found session after failed exchange');
                router.replace(next);
                return;
              }
            }
            logger.error('Auth callback: Code exchange error:', error);
            router.replace(`/${locale}?auth_error=true`);
            return;
          }

          // Successfully exchanged code - get session to confirm
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            logger.log('Auth callback: Session established successfully');
            router.replace(next);
            return;
          }
        }

        // Check for implicit flow tokens in hash fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (accessToken) {
          // Wait a moment for Supabase to process the hash
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: hashData } = await supabase.auth.getSession();
          if (hashData?.session) {
            logger.log('Auth callback: Session from hash tokens');
            router.replace(next);
            return;
          }
        }

        // Final check for session - might have been set asynchronously
        await new Promise(resolve => setTimeout(resolve, 300));
        const { data: finalCheck } = await supabase.auth.getSession();
        if (finalCheck?.session) {
          logger.log('Auth callback: Session found in final check');
          router.replace(next);
          return;
        }

        // Fallback: redirect to home with error
        logger.warn('Auth callback: No session found, redirecting with error');
        router.replace(`/${locale}?auth_error=true`);
      } catch (err) {
        logger.error('Auth callback exception:', err);
        router.replace(`/${locale}?auth_error=true`);
      }
    };

    handleCallback();
  }, [router, searchParams, locale]);

  return <LoadingUI />;
}

// Main export with Suspense boundary - required for useSearchParams in Next.js App Router
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
