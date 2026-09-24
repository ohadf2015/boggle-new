/**
 * The arena behind the teacher's launch screen — the same game-show stage the
 * projector lobby opens on, so picking a game and running it feel like one
 * place. Decorative, eager, never faded in (a fullscreen opacity tween is the
 * Class-5 mobile flash), under a navy scrim so every control keeps contrast.
 * The parent must be `relative`; this fills it.
 */

export function LaunchStageBackdrop() {
  return (
    <>
      <img
        data-testid="lobby-arena-art"
        src="/images/education/arena-lobby-bg.webp"
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-bottom"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-neo-navy/55" />
    </>
  );
}

export default LaunchStageBackdrop;
