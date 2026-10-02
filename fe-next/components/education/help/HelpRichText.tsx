import Link from 'next/link';
import { translateKey } from '@/lib/i18n/serverTranslate';
import { parseHelpText } from './helpText';
import { helpArticleHref } from './helpRegistry';

function linkHref(locale: string, target: string): string {
  const [kind, rest] = target.split(':');
  return kind === 'help' ? helpArticleHref(locale, rest) : `/${locale}${rest}`;
}

/** Renders article text; `[[key]]` becomes the app's real button label in the reader's language. */
export function HelpRichText({ text, locale }: { text: string; locale: string }) {
  return (
    <>
      {parseHelpText(text).map((seg, i) => {
        if (seg.type === 'bold') return <strong key={i} className="font-bold text-neo-white">{seg.value}</strong>;
        if (seg.type === 'label') {
          return (
            <span
              key={i}
              data-ui-label={seg.key}
              className="mx-0.5 inline-block whitespace-nowrap rounded-[6px] border-2 border-neo-black bg-neo-cream px-1.5 py-px align-baseline font-neo-display text-[0.8em] font-black uppercase leading-snug tracking-wide text-neo-navy shadow-hard-sm"
            >
              {translateKey(seg.key, locale)}
            </span>
          );
        }
        if (seg.type === 'link') {
          return (
            <Link
              key={i}
              href={linkHref(locale, seg.target)}
              className="font-bold text-neo-cyan underline decoration-2 underline-offset-4 hover:text-neo-lime"
            >
              {seg.value}
            </Link>
          );
        }
        return <span key={i}>{seg.value}</span>;
      })}
    </>
  );
}
