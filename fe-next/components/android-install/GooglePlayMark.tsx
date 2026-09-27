/**
 * The 4-facet Google Play triangle, extracted so the install popup and the SEO
 * landing-page badge (PlayStoreCTA) share one piece of brand art instead of
 * duplicating the polygons.
 */
export default function GooglePlayMark({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 26"
      width={size}
      height={(size * 26) / 24}
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {/* 4-facet Play triangle fanning from the left-centre vertex (2,13) */}
      <polygon points="2,13 2,2 12,7.5" fill="#00C566" />
      <polygon points="2,13 12,7.5 22,13" fill="#00A1FF" />
      <polygon points="2,13 22,13 12,18.5" fill="#FFC400" />
      <polygon points="2,13 12,18.5 2,24" fill="#FF424A" />
    </svg>
  );
}
