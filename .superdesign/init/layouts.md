# Layouts — LexiClash

## DesktopLobbyLayout (`host/components/pre-game/desktop/DesktopLobbyLayout.tsx`)
- 12-col grid: left 7/12 (xl:8/12) + right 5/12 (xl:4/12)
- Full height with overflow-y-auto on left column
- `p-4` to `p-8` responsive padding
- `gap-4` to `gap-8` responsive gaps
- Only rendered at `lg:` breakpoint (1024px+)

## Mobile Layout (in HostPreGameView)
- Single column, scrollable content + sticky CTA at bottom
- `px-3 py-2 space-y-2`

## Page Shell
- `h-dvh flex flex-col` with AutoHideHeader
- `bg-neo-navy` background
- `lg:max-w-7xl lg:mx-auto` container

## Header
- Sticky top, `px-3 py-1.5 bg-neo-navy/95 border-b-2 border-neo-black`
- Avatar + name on left, share + exit on right
