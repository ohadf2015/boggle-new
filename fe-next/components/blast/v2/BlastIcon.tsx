/**
 * A small inline SVG glyph in the Wordfall UI — the theme chips and the HUD
 * icons that replaced this mode's emoji.
 *
 * Deliberately a plain <img>. `next/image` does not optimise SVG (it passes it
 * through untouched unless `unoptimized` is set), and at 16–56px it would add a
 * wrapper element and a layout pass per glyph on a screen that already runs a
 * Pixi canvas. Centralising it here also means the eslint exemption is written
 * once with its reason rather than repeated at every call site.
 */
type Props = {
  /** Public path, e.g. `/blast/icons/coin.svg` or `/themes/ocean.svg`. */
  src: string;
  /** Rendered square size in px. Match the text size it sits beside. */
  size?: number;
  className?: string;
  /**
   * Escape hatch for values Tailwind can't see at build time — chiefly a glow
   * tinted by a runtime colour (the chest badge tints its rim per tier, so
   * `drop-shadow(... ${rimColor})` can never be a static utility class).
   */
  style?: React.CSSProperties;
};

export function BlastIcon({ src, size = 20, className, style }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see file header: next/image can't optimise SVG and costs a wrapper per glyph.
    <img
      aria-hidden
      alt=""
      src={src}
      width={size}
      height={size}
      style={style}
      className={`inline-block shrink-0${className ? ` ${className}` : ''}`}
    />
  );
}
