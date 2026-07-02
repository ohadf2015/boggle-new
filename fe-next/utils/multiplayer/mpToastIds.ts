/**
 * Stable react-hot-toast ids for the multiplayer create/join flow.
 *
 * Passing a stable `id` makes a repeated toast REPLACE the prior one instead of
 * stacking — fixes the "lots of toast messages" pile-up when a flaky join retries
 * or the same error fires across reconnect cycles.
 */
export const MP_TOAST_IDS = {
  roomGone: 'mp-room-gone',
  codeExists: 'mp-code-exists',
  usernameTaken: 'mp-username-taken',
  joinError: 'mp-join-error',
  rateLimited: 'mp-rate-limited',
  notConnected: 'mp-not-connected',
  connectionTimeout: 'mp-connection-timeout',
  loadingProfile: 'mp-loading-profile',
  rejoined: 'mp-rejoined',
} as const;
