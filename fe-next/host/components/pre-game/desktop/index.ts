/**
 * Desktop-specific components for the pre-game lobby
 *
 * These components are only rendered at lg: breakpoint (1024px+)
 * and provide a premium three-column desktop experience.
 */

// Export components
export { DesktopLobbyLayout } from './DesktopLobbyLayout';
export { SettingsPanel } from './SettingsPanel';
export { InviteCard } from './InviteCard';
export { EnhancedPlayerList } from './EnhancedPlayerList';

// Re-export types
export type { DesktopLobbyLayoutProps } from './DesktopLobbyLayout';
export type { SettingsPanelProps } from './SettingsPanel';
export type { InviteCardProps } from './InviteCard';
export type { EnhancedPlayerListProps } from './EnhancedPlayerList';
