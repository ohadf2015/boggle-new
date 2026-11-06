/**
 * Viewport-tall lobby chrome used while auth / TeacherGate / inner check resolve.
 *
 * PageLoader → TeacherGate → lobby used to swap a headerless full-bleed spinner
 * for the header + picker, which is the classroom-game CLS (p75 0.57).
 * The slots match the teacher shell the lobby now sits in: the phone top bar
 * below lg, the 240px sidebar from lg. The body fills the rest.
 */
export const CLASSROOM_GAME_HEADER_SLOT_CLASS =
  'min-h-[60px] shrink-0 border-b-[3px] border-neo-cream bg-neo-navy lg:hidden';
export const CLASSROOM_GAME_SIDEBAR_SLOT_CLASS =
  'hidden w-60 shrink-0 border-e-[3px] border-neo-cream bg-neo-navy lg:block';

export function ClassroomGameLoadingShell() {
  return (
    <div
      data-testid="classroom-game-loading-shell"
      className="relative flex h-dvh w-full shrink-0 flex-col overflow-hidden bg-neo-navy"
    >
      <div data-testid="classroom-game-header-slot" aria-hidden="true" className={CLASSROOM_GAME_HEADER_SLOT_CLASS} />
      <div className="flex min-h-0 flex-1">
        <div data-testid="classroom-game-sidebar-slot" aria-hidden="true" className={CLASSROOM_GAME_SIDEBAR_SLOT_CLASS} />
        <div className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-3 py-3 sm:px-6">
          <div
            data-testid="classroom-game-lobby-slot"
            aria-hidden="true"
            className="min-h-0 flex-1 animate-pulse rounded-neo bg-neo-navy-light"
          />
        </div>
      </div>
    </div>
  );
}

export default ClassroomGameLoadingShell;
