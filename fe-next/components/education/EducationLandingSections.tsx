import {
  BookOpen,
  Clock,
  Coins,
  Globe,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  Lock,
  Monitor,
  Sparkles,
  Timer,
  TrendingUp,
  Upload,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import type { EducationAccent, EducationSection } from '@/lib/seo/educationLanding';

/**
 * Tailwind v4 only generates classes it can see as literal strings, so every
 * accent variant is spelled out rather than composed at runtime.
 * Ink is navy on all four accents — white fails AA on purple (4.1:1) and
 * pink (3.6:1) at body size.
 */
export const ACCENT: Record<EducationAccent, { fill: string; ink: string; text: string; shadow: string }> = {
  lime: { fill: 'bg-neo-lime', ink: 'text-neo-navy', text: 'text-neo-lime', shadow: 'shadow-hard-lime' },
  pink: { fill: 'bg-neo-pink', ink: 'text-neo-navy', text: 'text-neo-pink', shadow: 'shadow-hard-pink' },
  cyan: { fill: 'bg-neo-cyan', ink: 'text-neo-navy', text: 'text-neo-cyan', shadow: 'shadow-hard-cyan' },
  purple: { fill: 'bg-neo-purple', ink: 'text-neo-navy', text: 'text-neo-purple', shadow: 'shadow-hard-purple' },
};

/**
 * Drawn icons from one library at one stroke weight. Content files name an
 * icon; unknown names degrade to a neutral mark rather than throwing.
 */
const ICONS = {
  book: BookOpen,
  clock: Clock,
  coins: Coins,
  globe: Globe,
  grid: LayoutGrid,
  graduation: GraduationCap,
  list: ListChecks,
  lock: Lock,
  monitor: Monitor,
  sparkles: Sparkles,
  timer: Timer,
  trending: TrendingUp,
  upload: Upload,
  users: Users,
  wifi: Wifi,
  zap: Zap,
} as const;

export type EducationIconName = keyof typeof ICONS;

function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name as EducationIconName] ?? Sparkles;
  return <Cmp className={className} strokeWidth={2.5} aria-hidden />;
}

function SectionHeading({ title, intro }: { title: string; intro?: string }) {
  return (
    <>
      <h2 className="font-neo-display text-3xl font-black uppercase leading-[1.05] sm:text-4xl">{title}</h2>
      {intro && <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-neo-white/75 sm:text-lg">{intro}</p>}
    </>
  );
}

/** Section wrapper. Spacing is generous above a heading, tight below it. */
function Block({ children }: { children: React.ReactNode }) {
  return <section className="mt-20 sm:mt-24">{children}</section>;
}

export function EducationSectionRenderer({
  section,
  accent,
}: {
  section: EducationSection;
  accent: EducationAccent;
}) {
  const a = ACCENT[accent];

  if (section.kind === 'features') {
    return (
      <Block>
        <SectionHeading title={section.title} intro={section.intro} />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {section.items.map((f) => (
            <li
              key={f.text}
              className="flex items-start gap-4 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard"
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-neo border-3 border-neo-black ${a.fill} ${a.ink} shadow-hard-sm`}>
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <p className="pt-2 text-sm leading-relaxed sm:text-base">{f.text}</p>
            </li>
          ))}
        </ul>
      </Block>
    );
  }

  if (section.kind === 'cards') {
    return (
      <Block>
        <SectionHeading title={section.title} intro={section.intro} />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.items.map((u) => (
            <div
              key={u.title}
              className="relative rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard"
            >
              {u.tag && (
                <span className={`absolute -top-3 start-4 border-2 border-neo-black ${a.fill} ${a.ink} px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest`}>
                  {u.tag}
                </span>
              )}
              <h3 className="mt-2 font-neo-display text-base font-black">{u.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neo-white/75">{u.desc}</p>
            </div>
          ))}
        </div>
      </Block>
    );
  }

  /* A timed plan reads as a sequence, so it gets a numbered rail — the one
     place section numbering carries information the reader actually needs. */
  if (section.kind === 'steps') {
    return (
      <Block>
        <SectionHeading title={section.title} intro={section.intro} />
        <ol className="mt-8 space-y-3">
          {section.items.map((s, i) => (
            <li
              key={s.step}
              className="grid gap-3 rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard sm:grid-cols-[auto_1fr_2fr] sm:items-baseline sm:gap-6"
            >
              <span className={`inline-grid h-9 w-9 place-items-center rounded-neo border-3 border-neo-black ${a.fill} ${a.ink} font-neo-display text-sm font-black`}>
                {i + 1}
              </span>
              <div>
                <p className={`font-neo-display text-sm font-black uppercase tracking-wide ${a.text}`}>{s.step}</p>
                <p className="mt-1 text-sm font-bold text-neo-white/90">{s.focus}</p>
              </div>
              <p className="text-sm leading-relaxed text-neo-white/75">{s.activity}</p>
            </li>
          ))}
        </ol>
      </Block>
    );
  }

  /* Word lists are the substance a teacher actually came for — set as data,
     not as prose, and copyable straight off the page. */
  if (section.kind === 'wordlist') {
    return (
      <Block>
        <SectionHeading title={section.title} intro={section.intro} />
        <div className="mt-8 space-y-6">
          {section.groups.map((g) => (
            <div key={g.label}>
              <h3 className={`font-neo-display text-sm font-black uppercase tracking-widest ${a.text}`}>{g.label}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {g.words.map((w) => (
                  <li
                    key={w}
                    className="rounded-neo border-2 border-neo-black bg-neo-navy-light px-3 py-1.5 font-neo-body text-sm font-bold text-neo-white shadow-hard-sm"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Block>
    );
  }

  if (section.kind === 'table') {
    return (
      <Block>
        <SectionHeading title={section.title} intro={section.intro} />
        <div className="mt-8 overflow-x-auto rounded-neo border-3 border-neo-black shadow-hard">
          <table className="w-full min-w-[34rem] border-collapse text-start text-sm">
            <thead>
              <tr className={`${a.fill} ${a.ink}`}>
                {section.columns.map((c) => (
                  <th key={c} scope="col" className="px-4 py-3 text-start font-neo-display text-xs font-black uppercase tracking-widest">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => (
                <tr key={row.join('|')} className="border-t-2 border-neo-black bg-neo-navy-light">
                  {row.map((cell, ci) => (
                    <td
                      key={`${row[0]}-${ci}`}
                      className={ci === 0 ? 'px-4 py-3 font-bold text-neo-white' : 'px-4 py-3 text-neo-white/75'}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>
    );
  }

  return (
    <Block>
      <SectionHeading title={section.title} />
      <div className="mt-4 space-y-4">
        {section.paragraphs.map((p) => (
          <p key={p.slice(0, 40)} className="max-w-[68ch] text-base leading-relaxed text-neo-white/75 sm:text-lg">
            {p}
          </p>
        ))}
      </div>
    </Block>
  );
}
