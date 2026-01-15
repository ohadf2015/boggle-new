/**
 * Admin API: Remove Daily Buzz Image
 * DELETE /api/admin/buzz/remove-image
 *
 * Removes the AI-generated image for a specific date/language challenge.
 * Used when an image is inappropriate or needs to be regenerated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { createClient } from '@supabase/supabase-js';

// Database operations can take time (especially with Supabase on slow connections)
// Default Next.js timeout is 10s which can cause timeouts
export const maxDuration = 60;

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

interface RemoveImageRequestBody {
  date: string;
  language: string;
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  let body: RemoveImageRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { date, language } = body;

  // Validate required fields
  if (!date || !language) {
    return NextResponse.json(
      { error: 'Missing required fields: date, language' },
      { status: 400 }
    );
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  // Validate language
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return NextResponse.json(
      { error: `Unsupported language. Use: ${SUPPORTED_LANGUAGES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Map language to region
    const regionMap: Record<string, string> = {
      en: 'US',
      he: 'IL',
      sv: 'SE',
      ja: 'JP',
      es: 'ES',
    };
    const region = regionMap[language] || 'US';

    // Update the challenge to remove the image
    // Note: No .select() needed - we don't use the returned data, just verify success
    const { error } = await supabase
      .from('daily_buzz_challenges')
      .update({
        image_url: null,
        image_prompt: null,
        image_category: null,
      })
      .eq('puzzle_date', date)
      .eq('language', language)
      .eq('region', region);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Challenge not found for this date/language' },
          { status: 404 }
        );
      }
      throw error;
    }

    console.log(`[Admin Buzz] Image removed for ${date} (${language}) by admin ${authResult.user?.email}`);

    return NextResponse.json({
      success: true,
      message: `Image removed successfully for ${language} on ${date}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Error removing image:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to remove image' },
      { status: 500 }
    );
  }
}
