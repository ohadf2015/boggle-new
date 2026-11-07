/**
 * Page → SW message types. Kept apart from swSource.ts so client code can
 * import them without bundling the whole service-worker script string.
 */

/** Starts warming one locale's offline page shells (see swSource.ts). */
export const SW_WARM_SHELLS_MESSAGE_TYPE = 'WARM_SHELLS';
