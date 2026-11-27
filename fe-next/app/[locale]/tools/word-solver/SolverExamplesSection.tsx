import { CompareTable, Section } from '@/components/landing/kit';
import type { SolverExamples } from './examples';

export function SolverExamplesSection({ examples }: { examples: SolverExamples }) {
  return (
    <Section title={examples.heading} intro={examples.lead}>
      <CompareTable
        highlight={-1}
        columns={[examples.lettersLabel, <span key="c" className="whitespace-nowrap">{examples.countLabel}</span>, examples.picksLabel]}
        rows={examples.rows.map((row) => [
          <span key="l" className="whitespace-nowrap">{row.letters}</span>,
          <span key="t" className="whitespace-nowrap">{row.total}{examples.countSuffix}</span>,
          <span key="p">
            <span className="font-bold">{row.picks.join(examples.listSeparator)}</span>
            <span className="block text-neo-black/70">{row.note}</span>
          </span>,
        ])}
        caption={<span className="text-sm">{examples.outro}</span>}
      />
    </Section>
  );
}
