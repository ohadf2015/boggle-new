# Layouts — Profile Page

## Mobile Layout
- Tab bar at top with 4 icons (LayoutDashboard, BarChart3, Trophy, Gem)
- Active tab: `bg-neo-yellow text-neo-black border-3 border-neo-black shadow-hard-sm`
- Swipeable content area with AnimatePresence
- Bottom nav bar (external, not part of profile)

## Desktop Layout  
- Max width: `max-w-6xl mx-auto`
- Single column stacked layout with `gap-6`
- XP + Coins side by side in `lg:grid-cols-2`

## Common Card Pattern
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay }}
  className="rounded-3xl mb-4 border-3 border-neo-cyan shadow-hard-cyan p-6 bg-slate-800/80"
>
```
