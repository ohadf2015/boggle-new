# Manual Testing Guide - Host Pre-Game View Compact UI

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open in browser:**
   ```
   http://localhost:3001/en/multiplayer
   ```

3. **Enter the host view:**
   - Scroll down to the "CREATE ROOM" section
   - Fill in room name (optional)
   - Click the green "CREATE ROOM" button
   - Wait for host view to load

---

## Testing Checklist

### Visual Inspection

#### Room Code Card
- [ ] Room code is clearly visible and readable
- [ ] Card padding looks balanced (not cramped)
- [ ] Language badge is visible
- [ ] Share buttons are clearly separated and clickable

#### Game Settings Card
- [ ] All elements are visible without scrolling
- [ ] Timer controls are easy to see and reach
- [ ] Game Type selector displays correctly
- [ ] Bot Controls section is visible
- [ ] Advanced Settings toggle button is clear

#### Players List
- [ ] Card width accommodates player names
- [ ] Avatar, name, and presence indicator fit comfortably
- [ ] List items are distinct and not cramped
- [ ] Card doesn't feel too narrow

#### Chat Section
- [ ] Chat input is visible
- [ ] At least 10-15 messages are visible without scrolling
- [ ] Scroll functionality works smoothly

---

### Mobile Testing (375px width)

**How to test:**
1. Open Chrome DevTools (F12)
2. Click "Toggle device toolbar"
3. Select "iPhone SE" or set width to 375px

**Tests:**
- [ ] Room code text is not truncated
- [ ] Timer +/- buttons are easy to tap (36x36px)
- [ ] All buttons have adequate spacing
- [ ] No horizontal scrolling required
- [ ] Chat height (280px) shows enough messages
- [ ] Advanced settings expand/collapse smoothly

**Success Criteria:**
All interactive elements work smoothly on mobile devices.

---

**Happy Testing!**
