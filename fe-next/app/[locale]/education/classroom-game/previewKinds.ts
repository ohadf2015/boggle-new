/** Kept apart from LiveSurfacePreview so PageClient can parse the query without pulling the dev chunk into production. */
export const LIVE_SURFACE_PREVIEW_KINDS = ['podium', 'projector', 'waiting', 'hostresults', 'phone', 'quiz', 'duel', 'ended'] as const;
export type LiveSurfacePreviewKind = (typeof LIVE_SURFACE_PREVIEW_KINDS)[number];
