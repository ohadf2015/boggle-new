import Link from 'next/link';

/** Exact-query anchor for GR #11385. The link text is the query, nothing else. */
export const BOGGLE_APP_FREE_QUERY = 'boggle app free';
export const BOGGLE_APP_FREE_HREF = '/en/play-boggle-online-free';

export function BoggleAppFreeLink({
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
        href={BOGGLE_APP_FREE_HREF}
        className="font-bold text-neo-cyan underline decoration-2 underline-offset-4"
      >
        {BOGGLE_APP_FREE_QUERY}
      </Link>
    </p>
  );
}
