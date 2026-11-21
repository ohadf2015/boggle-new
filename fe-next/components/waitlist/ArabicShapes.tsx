import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';
import { arabicText, type Typo } from './typography';

export interface WhyContent {
  heading: string;
  paragraphs: string[];
  forms: { title: string; labels: [string, string, string, string] };
  hamza: { title: string; caption: string };
  prefix: { title: string; caption: string };
}

const AIN_FORMS = ['ع', 'عـ', 'ـعـ', 'ـع'];
const ALEFS = ['ا', 'أ', 'إ', 'آ'];

function Glyph({ children, tone = 'bg-neo-cream', size = 'h-14 w-14 text-3xl sm:h-16 sm:w-16 sm:text-4xl' }: { children: ReactNode; tone?: string; size?: string }) {
  return (
    <span
      lang="ar"
      dir="rtl"
      className={cn('grid shrink-0 place-items-center rounded-neo border-neo-thick border-neo-black pb-1 font-extrabold leading-none text-neo-black shadow-hard-lg', tone, size, arabicText)}
    >
      {children}
    </span>
  );
}

function Panel({ title, accent, typo, children }: { title: string; accent: string; typo: Typo; children: ReactNode }) {
  return (
    <div className="rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy-light p-4 shadow-hard-xl sm:p-5">
      <h3 className={cn('mb-4 text-sm text-neo-white sm:text-base', typo.display, typo.rtl ? '' : 'uppercase tracking-widest')}>
        <span aria-hidden="true" className={cn('me-2 inline-block h-2.5 w-2.5 rounded-full border-2 border-neo-black align-middle', accent)} />
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ArabicShapes({ why, typo }: { why: WhyContent; typo: Typo }) {
  return (
    <section className="mt-20 sm:mt-24">
      <SectionHeading typo={typo} accent="pink">
        {why.heading}
      </SectionHeading>
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
        <div className={cn('space-y-4 text-base leading-relaxed text-neo-white sm:text-lg', typo.body)}>
          {why.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="grid gap-5">
          <Panel title={why.forms.title} accent="bg-neo-lime" typo={typo}>
            <ul className="grid grid-cols-4 gap-2 sm:gap-3">
              {AIN_FORMS.map((form, i) => (
                <li key={form} className="flex flex-col items-center gap-2">
                  <Glyph tone={i === 0 ? 'bg-neo-lime' : 'bg-neo-cream'}>{form}</Glyph>
                  <span className={cn('text-center text-xs font-bold text-neo-white sm:text-sm', typo.body)}>{why.forms.labels[i]}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={why.hamza.title} accent="bg-neo-cyan" typo={typo}>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {ALEFS.map((a) => (
                <Glyph key={a} tone="bg-neo-cyan">
                  {a}
                </Glyph>
              ))}
            </div>
            <p className={cn('mt-4 text-sm leading-relaxed text-neo-white sm:text-base', typo.body)}>{why.hamza.caption}</p>
          </Panel>

          <Panel title={why.prefix.title} accent="bg-neo-pink" typo={typo}>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Glyph tone="bg-neo-pink" size="h-14 px-3 text-3xl sm:h-16 sm:text-4xl">ال</Glyph>
              <span aria-hidden="true" className="font-neo-display text-2xl font-black text-neo-white">+</span>
              <Glyph size="h-14 px-3 text-3xl sm:h-16 sm:text-4xl">كتاب</Glyph>
              <span aria-hidden="true" className="font-neo-display text-2xl font-black text-neo-white">=</span>
              <Glyph tone="bg-neo-lime" size="h-14 px-3 text-3xl sm:h-16 sm:text-4xl">الكتاب</Glyph>
            </div>
            <p className={cn('mt-4 text-sm leading-relaxed text-neo-white sm:text-base', typo.body)}>{why.prefix.caption}</p>
          </Panel>
        </div>
      </div>
    </section>
  );
}
