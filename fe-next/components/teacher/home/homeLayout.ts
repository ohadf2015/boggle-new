/**
 * Teacher Home's page grid, shared by the live page and the loading skeletons that stand in for it.
 * One source, so a loader can never drift from the page it is a placeholder for (that drift read as the page
 * "loading twice" and jumping when the real layout replaced it).
 */
export const HOME_GRID_BASE =
  'mx-auto grid w-full max-w-[1280px] gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:gap-5 lg:px-8 lg:py-5 lg:[@media(max-height:820px)]:gap-4 lg:[@media(max-height:820px)]:py-3';
export const HOME_RAIL_COLUMNS = 'lg:grid-cols-[minmax(0,1fr)_20rem]';
export const HOME_MAIN_COLUMN = 'flex min-w-0 flex-col gap-3 sm:gap-4 lg:col-start-1 lg:row-start-1';
export const HOME_GREETING_ROW = 'flex items-start justify-between gap-3 max-sm:flex-col max-sm:gap-2';
export const HOME_RAIL_COLUMN = 'flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1 lg:pt-24';
