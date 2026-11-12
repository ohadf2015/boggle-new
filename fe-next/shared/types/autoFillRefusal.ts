export const AUTO_FILL_REFUSAL_REASONS = ['rate_limited', 'not_in_room', 'room_gone', 'not_host', 'in_progress', 'room_full'] as const;

/** Why the server did not seat the practice bots a host asked for. */
export type AutoFillRefusalReason = (typeof AUTO_FILL_REFUSAL_REASONS)[number];
