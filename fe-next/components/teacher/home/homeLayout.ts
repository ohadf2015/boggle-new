/**
 * Teacher Home's page grid, shared by the live page and the loading skeletons that stand in for it.
 * One source, so a loader can never drift from the page it is a placeholder for (that drift read as the page
 * "loading twice" and jumping when the real layout replaced it).
 */
export const HOME_GRID_BASE =
  'mx-auto grid w-full max-w-[1280px] grid-cols-[minmax(0,1fr)] gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:gap-5 lg:px-8 lg:py-5';
export const HOME_MAIN_COLUMN = 'flex min-w-0 flex-col gap-3 sm:gap-4';
// Fills the visible scroll area (phones lose the top bar and tab bar), so what follows the desk always starts below the fold.
export const HOME_FIRST_FRAME = 'min-h-[calc(100dvh-9rem)] lg:min-h-[calc(100dvh-2.5rem)]';
export const HOME_GREETING_ROW = 'flex items-start justify-between gap-3 max-sm:flex-col max-sm:gap-2';
