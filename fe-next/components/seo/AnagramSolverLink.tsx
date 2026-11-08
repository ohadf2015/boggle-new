import Link from 'next/link';

/** Exact-query anchor for GR #25983 ("solver" queries up 207x, 2026-11-08).
 *  The link text is the query, nothing else — same pattern as
 *  BoggleAppFreeLink (GR #11385). */
export const ANAGRAM_SOLVER_QUERY = 'anagram solver';
export const ANAGRAM_SOLVER_HREF = '/en/tools/word-solver';

export function AnagramSolverLink({
  lead,
  className,
}: {
  lead?: string;
  className?: string;
}) {
  return (
    <p className={className ?? 'my-6 font-neo-body text-sm leading-relaxed text-neo-white'}>
      {lead ? <span>{lead} </span> : null}
      <Link
        href={ANAGRAM_SOLVER_HREF}
        className="font-bold text-neo-cyan underline decoration-2 underline-offset-4"
      >
        {ANAGRAM_SOLVER_QUERY}
      </Link>
    </p>
  );
}
