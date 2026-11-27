import { CheckList, CompareTable, FaqList, Prose, Section, Steps, TileGrid } from '@/components/landing/kit';
import { EslPlayableDemo } from '@/components/education/EslPlayableDemo';
import { playFormats, LIVE_MODE_COUNT, PRACTICE_FORMAT_COUNT } from '@/lib/education/playFormats';
import type { EducationSection } from '@/lib/seo/educationLanding';
import { cn } from '@/lib/utils';

const PAPER = 'rounded-neo-lg border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-xl';
const CHIP = 'rounded-md border-2 border-neo-black/20 bg-neo-white px-2 py-0.5 text-sm font-bold';
const LABEL = 'font-neo-display text-sm font-bold uppercase tracking-wide';

function AnswerCard({ answer, points }: { answer: string; points?: readonly string[] }) {
  return (
    <div className={cn(PAPER, 'flex max-w-4xl flex-col gap-4 p-5 sm:p-7')}>
      <p data-answer className="text-base leading-relaxed sm:text-lg">
        {answer}
      </p>
      {points && points.length > 0 && (
        <ul className="grid gap-x-8 gap-y-2 border-t-2 border-neo-black/15 pt-4 text-[15px] leading-snug sm:grid-cols-2">
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-sm border-2 border-neo-black bg-neo-lime" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlayFormats({ locale, section }: { locale: string; section: Extract<EducationSection, { kind: 'playformats' }> }) {
  const { live, practice } = playFormats(locale);
  const count = String(live.length + practice.length);
  const groups = [
    { label: section.liveLabel.replace('{live}', String(LIVE_MODE_COUNT)), rows: live },
    { label: section.practiceLabel.replace('{practice}', String(PRACTICE_FORMAT_COUNT)), rows: practice },
  ];
  return (
    <Section title={section.heading.replace('{count}', count)}>
      <AnswerCard
        answer={section.intro
          .replace('{count}', count)
          .replace('{live}', String(LIVE_MODE_COUNT))
          .replace('{practice}', String(PRACTICE_FORMAT_COUNT))}
      />
      <FaqList
        headingLevel={3}
        openFirst
        items={groups.map((g) => ({
          q: g.label,
          a: (
            <ul className="divide-y-2 divide-neo-black/10">
              {g.rows.map((f) => (
                <li key={f.id} className="py-2.5 text-[15px] leading-snug">
                  <span className="font-bold">{f.name}</span> <span className="text-neo-black/80">{f.note}</span>
                </li>
              ))}
            </ul>
          ),
        }))}
      />
    </Section>
  );
}

/** One content section of an education landing, drawn with the landing kit. */
export function EducationKitSection({ section, locale }: { section: EducationSection; locale: string }) {
  switch (section.kind) {
    case 'features':
      return (
        <Section title={section.title} intro={section.intro}>
          <CheckList items={section.items.map((f) => f.text)} />
        </Section>
      );
    case 'cards':
      return (
        <Section title={section.title} intro={section.intro}>
          <TileGrid
            variant="paper"
            columns={section.items.length % 3 === 0 ? 3 : 2}
            items={section.items.map((u) => ({
              title: u.title,
              href: u.href ? `/${locale}${u.href}` : undefined,
              icon: u.tag ? <span className={cn(LABEL, 'text-xs text-neo-black/70')}>{u.tag}</span> : undefined,
              body: (
                <>
                  {u.desc}
                  {u.cta && <span className="mt-2 block font-neo-display font-bold underline decoration-neo-pink decoration-2 underline-offset-2">{u.cta}</span>}
                </>
              ),
            }))}
          />
        </Section>
      );
    case 'steps':
      return (
        <Section title={section.title} intro={section.intro}>
          <Steps
            items={section.items.map((s) => ({
              title: s.step,
              body: (
                <>
                  <p className="font-bold">{s.focus}</p>
                  <p className="mt-1">{s.activity}</p>
                </>
              ),
            }))}
          />
        </Section>
      );
    case 'wordlist':
      return (
        <Section title={section.title} intro={section.intro}>
          <FaqList
            headingLevel={3}
            openFirst
            items={section.groups.map((g) => ({
              q: g.label,
              a: (
                <ul className="flex flex-wrap gap-1.5">
                  {g.words.map((w) => (
                    <li key={w} className={CHIP}>
                      {w}
                    </li>
                  ))}
                </ul>
              ),
            }))}
          />
        </Section>
      );
    case 'playformats':
      return <PlayFormats locale={locale} section={section} />;
    case 'note':
      return (
        <section className={cn(PAPER, 'flex max-w-4xl flex-col gap-3 p-5 sm:p-7')}>
          <h2 className="font-neo-display text-xl font-bold sm:text-2xl">{section.heading}</h2>
          <p className="leading-relaxed">{section.body}</p>
          <a href={section.href} className="self-start font-bold underline decoration-neo-pink decoration-2 underline-offset-2">
            {section.cta} ↗
          </a>
        </section>
      );
    case 'depth':
      return (
        <>
          {section.sections.map((d) => (
            <Section key={d.heading} title={d.heading}>
              <AnswerCard answer={d.answer} points={d.points} />
            </Section>
          ))}
        </>
      );
    case 'classgames': {
      const { labels, games, heading, intro } = section.section;
      return (
        <Section title={heading} intro={intro}>
          <FaqList
            headingLevel={3}
            items={games.map((g) => ({
              q: g.name,
              a: (
                <div className="flex flex-col gap-3 text-[15px]">
                  <ul className="flex flex-wrap gap-1.5">
                    <li className={CHIP}>{labels.time}: {g.time}</li>
                    <li className={CHIP}>{labels.group}: {g.groupSize}</li>
                    <li className={CHIP}>{labels.drills}: {g.drills}</li>
                  </ul>
                  <dl className="flex flex-col gap-2">
                    {[
                      [labels.setup, g.setup],
                      [labels.rules, g.rules],
                      [labels.onLexiClash, g.runsWithNote],
                    ].map(([dt, dd]) => (
                      <div key={dt}>
                        <dt className="inline font-bold">{dt}: </dt>
                        <dd className="inline">{dd}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ),
            }))}
          />
        </Section>
      );
    }
    case 'playable':
      return (
        <Section title={section.title} intro={section.intro}>
          <EslPlayableDemo locale={locale} />
        </Section>
      );
    case 'table':
      return (
        <Section title={section.title} intro={section.intro}>
          <CompareTable columns={section.columns} rows={section.rows} highlight={-1} />
        </Section>
      );
    default:
      return (
        <Section title={section.title}>
          <Prose>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </Prose>
        </Section>
      );
  }
}
