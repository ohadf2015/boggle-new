import Link from 'next/link';
import { School } from 'lucide-react';

interface Props {
  t: (key: string) => string;
  language: string;
}

export function DistrictUpsellBanner({ t, language }: Props) {
  return (
    <div className="w-full bg-neo-lime border-b-3 border-black px-4 py-2 flex items-center gap-3">
      <School className="w-4 h-4 text-black shrink-0" />
      <span className="text-black font-bold text-sm">{t('teacher.districtBanner.text')}</span>
      <Link
        href={`/${language}/education/for-schools`}
        className="ms-auto text-black font-black text-sm underline underline-offset-2 hover:opacity-70 transition-opacity whitespace-nowrap"
        data-ph-capture-attribute-source="teacher_district_banner"
      >
        {t('teacher.districtBanner.cta')}
      </Link>
    </div>
  );
}
