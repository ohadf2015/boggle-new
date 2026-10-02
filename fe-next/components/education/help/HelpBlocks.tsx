import { Lightbulb, Sparkles } from 'lucide-react';
import type { HelpBlock } from './helpTypes';
import { HelpRichText } from './HelpRichText';
import { HelpShotFigure } from './HelpShotFigure';
import { helpPlainText } from './helpText';
import { helpLabel } from './helpSeo';
import type { HelpT } from './helpI18n';

export function HelpBlocks({ blocks, locale, t }: { blocks: HelpBlock[]; locale: string; t: HelpT }) {
  const plain = (s: string) => helpPlainText(s, helpLabel(locale)).replace(/\*\*/g, '');
  let firstShot = true;
  const takeFirst = () => {
    const was = firstShot;
    firstShot = false;
    return was;
  };
  return (
    <div className="space-y-6 text-lg leading-relaxed text-neo-gray-200">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return (
              <p key={i}>
                <HelpRichText text={b.text} locale={locale} />
              </p>
            );
          case 'h2':
            return (
              <h2 key={i} className="pt-4 font-neo-display text-2xl font-black text-neo-white sm:text-3xl">
                {b.text}
              </h2>
            );
          case 'list':
            return (
              <ul key={i} className="space-y-3">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span aria-hidden="true" className="mt-2.5 size-2.5 shrink-0 rotate-45 bg-neo-lime" />
                    <span>
                      <HelpRichText text={item} locale={locale} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case 'tip':
          case 'pro': {
            const isTip = b.t === 'tip';
            const Icon = isTip ? Lightbulb : Sparkles;
            return (
              <aside
                key={i}
                className={`rounded-neo border-4 border-neo-black p-5 shadow-hard-lg ${isTip ? 'bg-neo-cyan text-neo-navy' : 'bg-neo-purple text-neo-white'}`}
              >
                <p className="mb-1 flex items-center gap-2 font-neo-display text-sm font-black uppercase tracking-wider">
                  <Icon aria-hidden="true" className="size-4" />
                  {isTip ? t('eg2Help.article.tip') : t('eg2Help.article.pro')}
                </p>
                <p className="text-base font-medium leading-relaxed [&_strong]:text-inherit">
                  <HelpRichText text={b.text} locale={locale} />
                </p>
              </aside>
            );
          }
          case 'shot':
            return <HelpShotFigure key={i} id={b.id} alt={b.caption} caption={b.caption} priority={takeFirst()} />;
          case 'steps':
            return (
              <ol key={i} className="space-y-10">
                {b.items.map((s, j) => (
                  <li key={j} id={`step-${j + 1}`} className="scroll-mt-24">
                    <div className="flex items-start gap-4">
                      <span
                        aria-hidden="true"
                        className="grid size-11 shrink-0 place-items-center rounded-full border-4 border-neo-black bg-neo-cyan font-neo-display text-xl font-black text-neo-navy shadow-hard"
                      >
                        {j + 1}
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 font-neo-display text-xl font-black text-neo-white sm:text-2xl">
                          <span className="sr-only">{t('eg2Help.article.step', { count: j + 1 })}: </span>
                          {s.time ? (
                            <span className="rounded-[6px] border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-mono text-sm font-black text-neo-navy">
                              {s.time}
                            </span>
                          ) : null}
                          <span>{s.title}</span>
                        </h3>
                        {s.body ? (
                          <p className="mt-2">
                            <HelpRichText text={s.body} locale={locale} />
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {s.shot ? (
                      <div className="mt-5 sm:ps-15">
                        <HelpShotFigure id={s.shot} alt={plain(s.title)} priority={takeFirst()} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            );
        }
      })}
    </div>
  );
}
