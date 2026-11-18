/** Shared wire types for the live in-app notice channel (`notify:inApp`). */
export const LIVE_NOTICE_EVENT = 'notify:inApp';

export interface LiveNotice {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink?: string;
  senderId?: string;
  requestId?: string;
}
