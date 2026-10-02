import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import type { HelpNextStepId } from './helpTypes';
import { helpNextStepHref } from './helpRegistry';
import { helpT } from './helpI18n';

/** Every article ends on an action, never a dead end. */
export function HelpNextStep({ locale, next }: { locale: string; next: HelpNextStepId }) {
  const t = helpT(locale);
  return (
    <section
      data-help-next={next}
      className="relative mt-14 overflow-hidden rounded-neo border-4 border-neo-black bg-neo-lime p-6 text-neo-navy shadow-hard-xl sm:p-8"
    >
      <div className="flex items-center gap-5">
        <div className="min-w-0 flex-1">
          <p className="font-neo-display text-xs font-black uppercase tracking-widest">{t('eg2Help.next.eyebrow')}</p>
          <h2 className="mt-1 font-neo-display text-2xl font-black sm:text-3xl">{t(`eg2Help.next.${next}.title`)}</h2>
          <p className="mt-2 text-base font-semibold sm:text-lg">{t(`eg2Help.next.${next}.body`)}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={helpNextStepHref(locale, next)}
              data-ph-capture-attribute-cta={`help_next_${next}`}
              className="inline-flex items-center justify-center gap-2 rounded-neo border-4 border-neo-cream/50 bg-neo-navy px-6 py-3 font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard-lg transition-transform hover:-translate-y-1"
            >
              {t(`eg2Help.next.${next}.cta`)}
              <DirectionalIcon icon={ArrowRight} className="size-5" />
            </Link>
            {next !== 'liveGame' ? (
              <Link
                href={helpNextStepHref(locale, 'liveGame')}
                data-ph-capture-attribute-cta="help_next_secondary_live"
                className="text-center font-bold underline decoration-2 underline-offset-4 hover:no-underline"
              >
                {t('eg2Help.next.secondary')}
              </Link>
            ) : null}
          </div>
        </div>
        <Image
          src="/mascot/teacher/badge-go-live.webp"
          alt=""
          width={128}
          height={128}
          sizes="128px"
          className="hidden size-32 shrink-0 sm:block"
        />
      </div>
    </section>
  );
}
