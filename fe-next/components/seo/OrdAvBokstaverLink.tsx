import Link from 'next/link';

export const ORD_AV_BOKSTAVER_QUERY = 'ord av bokstäver';
export const ORD_AV_BOKSTAVER_HREF = '/sv/tools/word-solver';

export function OrdAvBokstaverLink({
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
        href={ORD_AV_BOKSTAVER_HREF}
        className="font-bold text-neo-cyan underline decoration-2 underline-offset-4"
      >
        {ORD_AV_BOKSTAVER_QUERY}
      </Link>
    </p>
  );
}
