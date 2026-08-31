/**
 * Renders a heading with one phrase visually accented.
 *
 * The accent is decoration, so it degrades instead of corrupting: when the
 * heading does not contain the phrase — which is the case for every locale
 * whose copy is not English — the heading renders exactly as translated.
 *
 * The pattern this replaces used `heading.split(/phrase/)` and rendered the
 * phrase whenever the index was 0. `split` returns `[whole]` on no match, so
 * index 0 was always reached and the English phrase was appended onto every
 * translated heading.
 */
export function HighlightedHeading({
  text,
  highlight,
  highlightClassName,
}: {
  text: string;
  highlight?: string;
  highlightClassName?: string;
}) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (at === -1 || !highlight) return <>{text}</>;

  return (
    <>
      {text.slice(0, at)}
      <span className={highlightClassName}>{highlight}</span>
      {text.slice(at + highlight.length)}
    </>
  );
}
