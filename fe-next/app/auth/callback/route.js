import { NextResponse } from 'next/server';

// This route handles OAuth callback by redirecting to the client-side page
// which properly exchanges the code and establishes the session client-side
export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const errorParam = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors from provider
  if (errorParam) {
    const errorUrl = new URL('/', requestUrl.origin);
    errorUrl.searchParams.set('auth_error', 'true');
    if (errorDescription) {
      errorUrl.searchParams.set('error_message', errorDescription);
    }
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    // Redirect to client-side callback page which will handle the code exchange
    // This ensures the session is properly stored in browser storage
    const clientCallbackUrl = new URL('/en/auth/callback', requestUrl.origin);
    clientCallbackUrl.searchParams.set('code', code);
    if (next && next !== '/') {
      clientCallbackUrl.searchParams.set('next', next);
    }
    return NextResponse.redirect(clientCallbackUrl);
  }

  // No code provided - redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
