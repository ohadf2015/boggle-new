'use client';

import { useEffect } from 'react';
import { useHoliday } from '@/hooks/useHoliday';
import { subscribeMascotEvents } from '@/lib/blast/mascotBus';
import { noticeHolidayWord } from '@/lib/holidays/holidayClient';
import MomentLayer from './MomentLayer';
import SecretCelebration from './SecretCelebration';
import SnowGlobe, { useShakeToGlobe } from './SnowGlobe';
import Snowballs from './Snowballs';
import '../holidayFx.css';

export default function HolidayEggsLayer() {
  const { holiday, resolved } = useHoliday();
  const on = resolved && !!holiday;
  const shake = useShakeToGlobe(on);

  useEffect(() => {
    if (!on) return;
    return subscribeMascotEvents((e) => {
      if (e.kind === 'word-submitted' && e.word) noticeHolidayWord(e.word);
    });
  }, [on]);

  if (!on || !holiday) return null;
  return (
    <>
      <SecretCelebration holiday={holiday} />
      <SnowGlobe {...shake} />
      <Snowballs />
      <MomentLayer holiday={holiday} />
    </>
  );
}
