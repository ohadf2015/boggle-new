'use client';
import { KeyRound, Languages, ShieldCheck, Laptop, ListChecks } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const PROOF = [
  { key: 'noLogins', Icon: KeyRound, chip: 'bg-neo-lime' },
  { key: 'languages', Icon: Languages, chip: 'bg-neo-cyan' },
  { key: 'ownLists', Icon: ListChecks, chip: 'bg-neo-yellow' },
  { key: 'noAds', Icon: ShieldCheck, chip: 'bg-neo-pink' },
  { key: 'anyDevice', Icon: Laptop, chip: 'bg-neo-purple' },
] as const;

export function LandingProofStrip() {
  const { t } = useLanguage();
  return (
    <section aria-label={t('eg2Land.proof.label')} className="border-y-3 border-neo-black bg-neo-cream">
      <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-x-6 gap-y-3 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-5 lg:px-8">
        {PROOF.map(({ key, Icon, chip }) => (
          <li key={key} className="flex items-center gap-3 text-neo-navy">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black ${chip} shadow-hard-sm`}>
              <Icon className="size-[18px]" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="text-sm font-bold leading-snug">{t(`eg2Land.proof.${key}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default LandingProofStrip;
