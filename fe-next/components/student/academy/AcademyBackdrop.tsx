/**
 * The Academy world painted behind a student screen, so every student surface
 * (join, live lobby, results, practice, profile) sits in the same place as the map.
 *
 * Absolute + `-z-10`: the parent must be positioned and `isolate`, so the world
 * paints behind its content without z-indexing every child. Static: no entrance
 * opacity tween on a fullscreen layer (pitfall class 5).
 */

export type AcademyArt = 'map' | 'arena' | 'podium';

const SCENE: Record<Exclude<AcademyArt, 'map'>, string> = {
  arena: '/images/education/arena-lobby-bg.webp',
  podium: '/images/education/podium-bg.webp',
};

// The map is busy and bright, so it goes out of focus; the scenes keep their edges lit around a dark middle.
const SCRIM: Record<AcademyArt, string> = {
  map: 'bg-[linear-gradient(180deg,rgba(18,13,51,0.55)_0%,rgba(18,13,51,0.72)_45%,rgba(18,13,51,0.88)_100%)] backdrop-blur-[6px]',
  arena: 'bg-[radial-gradient(ellipse_at_center,rgba(15,17,40,0.82)_0%,rgba(15,17,40,0.55)_45%,rgba(15,17,40,0.25)_100%)]',
  podium: 'bg-[radial-gradient(ellipse_at_center,rgba(15,17,40,0.78)_0%,rgba(15,17,40,0.5)_50%,rgba(15,17,40,0.3)_100%)]',
};

const IMG = 'absolute inset-0 h-full w-full select-none object-cover object-center';

export function AcademyBackdrop({ art }: { art: AcademyArt }) {
  return (
    <div
      data-testid="academy-backdrop"
      data-art={art}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-edu-surface"
    >
      {art === 'map' ? (
        <picture>
          <source media="(orientation: portrait)" srcSet="/images/education/academy-map-portrait.webp" />
          <img src="/images/education/academy-map-landscape.webp" alt="" decoding="async" className={IMG} />
        </picture>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- plain decorative scene, already a sized webp
        <img src={SCENE[art]} alt="" decoding="async" className={IMG} />
      )}
      <div className={`absolute inset-0 ${SCRIM[art]}`} />
      {art !== 'map' && <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-neo-navy/90 to-transparent" />}
    </div>
  );
}
