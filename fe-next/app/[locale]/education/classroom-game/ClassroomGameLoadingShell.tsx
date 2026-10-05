/**
 * Viewport-tall lobby chrome used while auth / TeacherGate / inner check resolve.
 *
 * PageLoader → TeacherGate → lobby used to swap a headerless full-bleed spinner
 * for EducationHeader + picker, which is the classroom-game CLS (p75 0.57).
 * Header slot matches EducationHeader min-heights; the body fills the rest.
 */
export const CLASSROOM_GAME_HEADER_SLOT_CLASS =
  'min-h-[60px] sm:min-h-[70px] lg:min-h-[80px] shrink-0 border-b-2 border-neo-cream/40 bg-neo-navy';

export function ClassroomGameLoadingShell() {
  return (
    <div
      data-testid="classroom-game-loading-shell"
      className="relative flex h-dvh w-full shrink-0 flex-col overflow-hidden bg-neo-navy"
    >
      <div data-testid="classroom-game-header-slot" aria-hidden="true" className={CLASSROOM_GAME_HEADER_SLOT_CLASS} />
      <div className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden px-3 py-3 sm:px-6">
        <div
          data-testid="classroom-game-lobby-slot"
          aria-hidden="true"
          className="min-h-0 flex-1 animate-pulse rounded-neo bg-neo-navy-light"
        />
      </div>
    </div>
  );
}

export default ClassroomGameLoadingShell;
