import { NextRequest, NextResponse } from 'next/server';
import { createClient, getSessionUser } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WebVitalPayload {
  metric_name: string;
  metric_value: number;
  metric_rating: 'good' | 'needs-improvement' | 'poor';
  page_url: string;
  page_path: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  connection_type: string | null;
  navigation_type: string | null;
  session_id: string;
  user_agent: string;
  metadata: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const data: WebVitalPayload = await request.json();

    // Validate required fields
    // Note: metric_value can be 0 (valid for CLS), so use typeof check
    if (!data.metric_name || typeof data.metric_value !== 'number' || !data.metric_rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate metric name
    const validMetrics = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'];
    if (!validMetrics.includes(data.metric_name)) {
      return NextResponse.json(
        { error: 'Invalid metric name' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await createClient();

    // Get current user from session JWT (no network call — proxy already refreshed)
    const { user } = await getSessionUser(supabase);

    // Extract country code from headers if available
    const countryCode = request.headers.get('cf-ipcountry') ||
                       request.headers.get('x-vercel-ip-country') ||
                       null;

    // Insert web vital record
    const { error } = await supabase
      .from('web_vitals')
      .insert({
        metric_name: data.metric_name,
        metric_value: data.metric_value,
        metric_rating: data.metric_rating,
        page_url: data.page_url,
        page_path: data.page_path,
        device_type: data.device_type,
        connection_type: data.connection_type,
        player_id: user?.id || null,
        session_id: data.session_id,
        country_code: countryCode,
        navigation_type: data.navigation_type,
        user_agent: data.user_agent,
        metadata: data.metadata
      });

    if (error) {
      const errorMessage = error.message || 'Unknown error';
      console.error('Error saving web vital:', errorMessage);
      return NextResponse.json(
        { error: 'Failed to save metric' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error processing web vital:', errorMessage);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
