import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Redirect to profile setup if new user, otherwise to home
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
    }
  }

  // Return to home with error
  return NextResponse.redirect(new URL('/?auth_error=true', requestUrl.origin));
}
