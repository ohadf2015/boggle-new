/**
 * Admin API: Regenerate Daily Buzz Image
 * POST /api/admin/buzz/regenerate-image
 *
 * Regenerates only the hero image for a Daily Buzz, keeping all challenges intact.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { generateChallengeImage, categorizeTopic } from '@/backend/services/imagenClient';

// Image generation can take time - 70s to accommodate Imagen API
export const maxDuration = 70;

interface RegenerateImageRequestBody {
  date: string;
  language: string;
}

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

async function getSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  let body: RegenerateImageRequestBody;
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
    const supabase = await getSupabaseClient();

    // Fetch existing challenge data to get trending topics
    const { data: existingData, error: fetchError } = await supabase
      .from('daily_buzz')
      .select('*')
      .eq('puzzle_date', date)
      .eq('language', language)
      .single();

    if (fetchError || !existingData) {
      return NextResponse.json(
        { error: `No Daily Buzz found for ${date} (${language})` },
        { status: 404 }
      );
    }

    // Parse challenges to get trending topics
    const challenges = existingData.challenges || [];
    if (challenges.length === 0) {
      return NextResponse.json(
        { error: 'No challenges found to base image on' },
        { status: 400 }
      );
    }

    // Use the first trending topic from challenges
    const firstTrendTopic = challenges[0]?.trend_topic || 'trending';
    const category = categorizeTopic(firstTrendTopic);

    console.log(`[Admin Buzz] Regenerating image for ${language}/${date}, topic: ${firstTrendTopic}, category: ${category}`);

    // Generate new image
    const imageResult = await generateChallengeImage(firstTrendTopic, category, language);

    // Update database with new image
    const { error: updateError } = await supabase
      .from('daily_buzz')
      .update({
        image_url: imageResult.url,
        image_prompt: imageResult.prompt,
        image_category: imageResult.category,
        updated_at: new Date().toISOString(),
      })
      .eq('puzzle_date', date)
      .eq('language', language);

    if (updateError) {
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    console.log(`[Admin Buzz] Image regenerated successfully: ${imageResult.url}`);

    return NextResponse.json({
      success: true,
      message: 'Image regenerated successfully',
      data: {
        image_url: imageResult.url,
        image_prompt: imageResult.prompt,
        image_category: imageResult.category,
        cost: imageResult.cost,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Buzz] Image regeneration error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
