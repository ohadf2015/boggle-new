import { Languages } from 'lucide-react';
import { helpT } from './helpI18n';
import { isHelpLocale } from './helpTypes';

const KEY = 'eg2Help.fallbackNote';

/** Shown on a locale whose help is not translated yet, above the English article. */
export function HelpFallbackNote({ locale }: { locale: string }) {
  if (isHelpLocale(locale)) return null;
  const text = helpT(locale)(KEY);
  return (
    <p
      data-testid="help-fallback-note"
      role="note"
      className="mx-auto mt-4 flex max-w-6xl items-start gap-2 rounded-neo border-2 border-neo-yellow bg-neo-navy-light px-4 py-2 font-neo-body text-sm font-bold text-neo-yellow"
    >
      <Languages className="mt-0.5 size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
      {text === KEY ? 'This guide is not translated into your language yet, so it is shown in English.' : text}
    </p>
  );
}
