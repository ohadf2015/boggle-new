import type { HolidayWrappedStats } from '@/lib/holidays/wrapped.server';

export interface WrappedSlide {
  id: string;
  art: string;
  value: string;
  labelKey: string;
  params?: Record<string, string | number>;
}

export function wrappedSlides(s: HolidayWrappedStats): WrappedSlide[] {
  const h = s.holiday;
  const slides: WrappedSlide[] = [
    { id: 'intro', art: `/holidays/m-${h}.webp`, value: '', labelKey: `holiday.wrapped.${h}.intro` },
    { id: 'days', art: h === 'hanukkah' ? '/holidays/props-menorah.webp' : '/holidays/props-gift-red.webp', value: `${s.lit}/${s.total}`, labelKey: `holiday.wrapped.${h}.days` },
    { id: 'words', art: '/holidays/props-star.webp', value: String(s.words), labelKey: 'holiday.wrapped.words', params: { games: s.games } },
  ];
  if (s.longest) slides.push({ id: 'longest', art: '/holidays/props-snowflake.webp', value: s.longest.toUpperCase(), labelKey: 'holiday.wrapped.longest' });
  slides.push({ id: 'hunt', art: '/holidays/gold-magnifier.webp', value: `${s.huntFound}/${s.huntGoal}`, labelKey: 'holiday.wrapped.hunt' });
  slides.push({ id: 'secrets', art: '/holidays/gold-key.webp', value: String(s.secrets), labelKey: 'holiday.wrapped.secrets' });
  if (s.tableRank) slides.push({ id: 'table', art: '/holidays/gold-medal.webp', value: `#${s.tableRank}`, labelKey: 'holiday.wrapped.table', params: { size: s.tableSize } });
  slides.push({ id: 'finale', art: `/holidays/gift-tier-${h === 'hanukkah' ? 8 : 9}.webp`, value: '', labelKey: 'holiday.wrapped.finale' });
  return slides;
}
