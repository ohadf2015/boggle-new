'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { getHolidayState, keepHolidayClass, subscribeHoliday } from '@/lib/holidays/holidayDom';
import { PermanentEggView } from './PermanentEgg';

const holidayNow = () => getHolidayState().holiday;
const none = () => null;

export default function NotFoundLatke({ text, label }: { text: string; label: string }) {
  const holiday = useSyncExternalStore(subscribeHoliday, holidayNow, none);
  useEffect(() => keepHolidayClass(), []);
  if (!holiday) return null;
  return <PermanentEggView kind="lost_latke" text={text} label={label} className="mb-4" />;
}
