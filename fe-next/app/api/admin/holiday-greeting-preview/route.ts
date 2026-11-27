import { NextRequest, NextResponse } from 'next/server';
import { generateHolidayGreetingHtml, HOLIDAY_KEYS_FOR_EMAIL } from '@/lib/holidayGreetingEmail';
import { asHolidayEmailLanguage } from '@/lib/email/templates/holidayGreeting.copy';
import type { HolidayKey } from '@/lib/holidays/calendar';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const params = request.nextUrl.searchParams;
  const language = asHolidayEmailLanguage(params.get('language'));
  const holidayParam = params.get('holiday') as HolidayKey | null;
  const holiday = holidayParam && HOLIDAY_KEYS_FOR_EMAIL.includes(holidayParam) ? holidayParam : 'hanukkah';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';

  const { html } = await generateHolidayGreetingHtml({
    holiday,
    language,
    recipientName: 'Alex',
    unsubscribeUrl: `${baseUrl}/${language}/unsubscribe`,
  });

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
