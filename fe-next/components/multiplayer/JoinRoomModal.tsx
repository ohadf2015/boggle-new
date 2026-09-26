/**
 * Legacy path: the join flow is now the entry's `JoinSheet` (DESIGN §f ENTRY).
 * MultiplayerFlow imports through here so the MultiplayerFlow.* guard tests,
 * which mock this module path, keep exercising the real contract.
 */
export { default } from './entry/JoinSheet';
export type { JoinSheetProps as JoinRoomModalProps } from './entry/JoinSheet';
