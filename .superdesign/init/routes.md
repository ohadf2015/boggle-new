# Routes — LexiClash

## Multiplayer Flow
- `/[locale]/multiplayer` — Main multiplayer page
  - Lobby (MultiplayerFlow → MultiplayerLobby) — join/host room selection
  - Pre-game (HostPreGameView / MultiplayerLobbyView) — inside room, waiting to start
  - In-game (HostInGameView / PlayerView)
  - Results (ResultsPage)

## Current Focus: Host Pre-Game View
- File: `host/components/HostPreGameView.tsx`
- Desktop: DesktopLobbyLayout (2-column)
  - Left: StartButton, PlayerRoster, BattleModeCard
  - Right: InviteCard, RoomChat
- Mobile: Stacked with sticky StartButton at bottom
