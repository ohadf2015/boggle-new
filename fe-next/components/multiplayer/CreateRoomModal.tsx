/**
 * Legacy path: the create flow is now the entry's `CreateSheet` (DESIGN §f
 * ENTRY). MultiplayerFlow imports through here so the MultiplayerFlow.* guard
 * tests, which mock this module path, keep exercising the real contract.
 */
export { default } from './entry/CreateSheet';
export type { CreateSheetProps as CreateRoomModalProps, CreateRoomConfig } from './entry/CreateSheet';
