/**
 * Desktop-specific components for the pre-game lobby
 *
 * These components are only rendered at lg: breakpoint (1024px+)
 * and provide a premium three-column desktop experience.
 */

// Export components as they are created
export { DesktopLobbyLayout } from './DesktopLobbyLayout';
export { SettingsPanel } from './SettingsPanel';
export { GamePreviewCard } from './GamePreviewCard';
export { InviteCard } from './InviteCard';
export { EnhancedPlayerList } from './EnhancedPlayerList';

// Re-export types
export type { DesktopLobbyLayoutProps } from './DesktopLobbyLayout';
export type { SettingsPanelProps } from './SettingsPanel';
export type { GamePreviewCardProps } from './GamePreviewCard';
export type { InviteCardProps } from './InviteCard';
export type { EnhancedPlayerListProps } from './EnhancedPlayerList';
