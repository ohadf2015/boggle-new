# Shared UI Components — LexiClash

## Key Primitives
- `EnhancedButton` — Neo-brutalist button with variants (cyan, lime, pink, outline), haptic feedback, animations
- `Avatar` — Player avatar with custom SVG parts or fallback
- `LevelBadge` — Level number badge with size variants
- `CoinBalance` — Coin display with animated counter
- `Loader` — Loading spinner with size variants
- `StatCard` — Stats display card with icon, value, label, progress bar
- `XpProgressBar` — XP progress bar with prestige support

## Layout Patterns
- Cards: `rounded-3xl border-3 border-neo-* shadow-hard-* bg-slate-800/80 p-4/p-6`
- Section headers: `font-black font-neo-display uppercase flex items-center gap-2`
- Inner panels: `bg-black/40 rounded-xl border-3 border-neo-black`
- Stat values: `font-black text-neo-* text-lg/xl`
- Labels: `text-[10px] font-bold uppercase tracking-wide text-gray-400`
