import type { SolverExamples } from './examples';

export function SolverExamplesSection({ examples }: { examples: SolverExamples }) {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-12 font-neo-body text-neo-white">
      <h2 className="text-xl font-neo-display font-bold text-neo-pink uppercase tracking-wider mb-3">
        {examples.heading}
      </h2>
      <p className="text-slate-300 text-sm mb-4">{examples.lead}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-neo-cyan">
              <th scope="col" className="py-2 pe-3">{examples.lettersLabel}</th>
              <th scope="col" className="py-2 pe-3 whitespace-nowrap">{examples.countLabel}</th>
              <th scope="col" className="py-2">{examples.picksLabel}</th>
            </tr>
          </thead>
          <tbody>
            {examples.rows.map((row) => (
              <tr key={row.letters} className="border-t border-white/10 align-top">
                <td className="py-2 pe-3 font-bold whitespace-nowrap">{row.letters}</td>
                <td className="py-2 pe-3 whitespace-nowrap">{row.total}{examples.countSuffix}</td>
                <td className="py-2">
                  <span className="font-bold">{row.picks.join(examples.listSeparator)}</span>
                  <span className="block text-slate-400">{row.note}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-slate-400 text-sm mt-4">{examples.outro}</p>
    </section>
  );
}
