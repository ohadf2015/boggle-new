import type { HolidayKey } from '@/lib/holidays/calendar';

export const holidayAccentBg = (holiday: HolidayKey) => (holiday === 'hanukkah' ? 'bg-neo-holiday-blue' : 'bg-neo-holiday-red');
