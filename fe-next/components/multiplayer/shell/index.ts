/**
 * The multiplayer shell + HUD primitives. Every MP state renders inside
 * `MpScreen`; piece builders compose these instead of re-inventing chrome.
 * FOUNDATION owns this folder — pieces must not edit it.
 */
export { MpScreen, type MpScreenProps } from './MpScreen';
export { MpHudBar, type MpHudBarProps } from './MpHudBar';
export { MpTimer, ShellBadgeTimer, formatClock, MP_TIMER_PX, MP_TIMER_URGENT_SEC, type MpTimerProps, type MpTimerSize, type MpTimerColor } from './MpTimer';
export { MpScoreChip, type MpScoreChipProps, type MpScoreGain } from './MpScoreChip';
export { MpRankChip, type MpRankChipProps } from './MpRankChip';
export { MpRosterStrip, type MpRosterStripProps, type MpRosterPlayer } from './MpRosterStrip';
export { MpCallouts, CALLOUT_MS, BANNER_MS, type MpCallout, type MpBanner, type MpCalloutsProps } from './MpCallouts';
export { MpSheet, type MpSheetProps } from './MpSheet';
export { MpPrimaryCta, type MpPrimaryCtaProps } from './MpPrimaryCta';
export { MpRoomCode, type MpRoomCodeProps } from './MpRoomCode';
export { MpBackButton, type MpBackButtonProps } from './MpBackButton';
export { useMpShellLock, MP_SHELL_LOCK_CLASS } from './useMpShellLock';
