# v0.dev Prompt — 靜默之島 Player UI

把以下內容貼進 v0.dev 生成 React 組件。

---

#2a2a2a borders
- Font: "Noto Sans TC" (Traditional Chinese), 300/400/500/700

**Fear-reactive system** — the entire UI tints progressively as `socialFear` increases (0→6):
- Level 0-1: Normal dark theme
- Level 2-3: Subtle red tint bleeds into background (#0e0808), card borders darken to crimson
- Level 4-5: Card borders pulse with red glow (3s animation cycle), background darkens
- Level 6+: Intense red glow pulsing (2s), occasional text flicker animation

### Dopamine Reward Patterns

Add these micro-interactions and reward feedback loops:
1. **Vote button press**: Ripple effect from touch point → button glows crimson → satisfying scale bounce (0.95→1.02→1.0) → "locked" state with checkmark morph
2. **Round completion**: Stats animate with counter-scroll (old number slides up, new slides in) + delta badge (+1/-1) that fades after 2s
3. **Risk zone transitions**: When risk crosses thresholds (safe→caution→danger), show a brief full-width flash banner with haptic-style shake animation
4. **Event reveal**: Title typewriter-animates in, description fades up with staggered lines (50ms delay each)
5. **Coin flip**: 3D perspective flip with gravity bounce, result reveal with radial glow
6. **Taken away**: Screen shakes, red vignette closes in, text flickers and fades to black
7. **Progress indicator**: 6 dots at top showing event progress (filled = completed, pulsing = current, empty = future)
8. **Foreshadow accumulation**: Small ghost icons stack up on the side — each represents a past "silence" or "vague" choice that will come back to haunt you

### Screen Architecture

The game is a **single fullscreen viewport** that transitions between sub-screens. Structure:

```
┌──────────────────────────────┐
│ Progress dots (6) + Fear bar │  ← 40px, always visible
├──────────────────────────────┤
│                              │## Prompt

Build a mobile-first fullscreen game UI for "靜默之島" (Silent Island), a multiplayer White Terror historical simulation board game. The player interacts on their phone. The entire experience must fit within `100dvh` — **zero page scrolling**. Use Next.js, React, Tailwind CSS, shadcn/ui, and Framer Motion.

### Visual Design System

**Theme**: Oppressive surveillance state. Dark, minimal, tension-building.
- Background: Near-black (#0a0a0a) with subtle noise texture
- Primary text: #e0e0e0, Secondary: #888, Dim: #555
- Accent: Deep crimson (#8b1a1a → #c0392b gradient)
- Cards: #1a1a1a with 1px 
│    Current Screen Content    │  ← fills remaining space
│    (animated transitions)    │
│                              │
├──────────────────────────────┤
│         FABs (角色/紙條)      │  ← floating, bottom-right
└──────────────────────────────┘
```

### Persistent Header (40px)

Left side: 6 progress dots (small circles, ~8px each, with subtle connecting line)
- Completed: filled crimson
- Current: pulsing white ring
- Future: dim gray outline

Right side: Compact stat display
- `恐懼 N` (crimson) `|` `流通 N` (teal #4a9) `|` `風險 N` (amber, or flashing red if ≥7)

### Screen 1: Join Phase

Centered vertically:
- Game title "靜默之島" in large elegant serif-style
- Subtitle "選擇與代價" with letter-spacing 0.2em
- Room code display (if available)
- Name input field with subtle bottom-border style
- "加入遊戲" button with crimson gradient

### Screen 2: Lobby

Centered:
- Room code in large monospace
- Player name confirmed
- "等待關主開始遊戲..."
- Player count indicator with subtle pulse on new joins

### Screen 3: Event Display

Full-screen dramatic reveal:
- Event number badge (top, small, crimson) "事件 3/6"
- Title: Large, bold, centered, typewriter-reveals
- Description: Below title, secondary color, staggered line fade-in, max-height with internal scroll if needed
- Subtle atmospheric particle/noise overlay

### Screen 4: Silence Countdown (Overlay)

Completely takes over the screen (z-index above everything):
- Pure black background with subtle breathing animation (#000↔#030303)
- Giant countdown number (8rem), "breathing" scale animation
- Color transitions: white → yellow (≤20s) → red (≤10s) with faster pulsing
- "請保持沉默" label
- After 5 seconds, a subtle atmospheric text fades in at bottom

### Screen 5: Discussion

Centered:
- "🗣️ 討論時間" label
- Large timer "2:00" counting down
- "放下手機，面對面交談"

### Screen 6: Voting

Three vote buttons stacked vertically, each containing:
- Main label (e.g. "照實填寫問卷")
- Description text below in dim, smaller font (e.g. "你用最安全的措辭填完了問卷。你知道答案都是對的。")
- On press: ripple → scale bounce → crimson fill → checkmark
- Unselected buttons: fade to 50% opacity, disabled
- Timer at top: "剩餘 30 秒" with urgent styling ≤5s
- "你的選擇已鎖定" message after voting

**Public voting mode**: A badge "⚠ 公開投票" appears at top. Other players' votes appear in real-time as small chips below.

### Screen 7: Round Result

Scrollable inner area (outer frame fixed):
- **Narrative text**: Italicized, left-border accent, the story consequence of your choice
- **Risk delta**: "+1" in red or "-1" in green, with counter animation
- **Social narrative**: Centered italic, describes the group dynamic
- **Risk warning** (if risk 7+): Red-bordered alert with escalating text
- **Vote summary**: Horizontal bar chart (comply=blue, evade=gray, resist=red) with animated fill

### Screen 8: Foreshadow Settlement

Scrollable inner area:
- Warning title "⚠ 舊事被翻出" in pulsing red
- If has foreshadows: "你的過去被翻出了。" alert
- Narrative texts for each foreshadow
- Coin flip results inline (🪙 icon + result + risk change)
- Risk delta summary

### Screen 9: Ending (Overlay)

Takes over screen, pure black:
- Social ending title typewriters in (crimson, large)
- Social ending text fades in sentence by sentence
- Personal ending: icon + label (e.g. "📎 普通人") + personal text
- Closure text in italic
- Final stats
- "靜默反思 60s" countdown

### Floating Action Buttons

Two circular FABs (48px), bottom-right, stacked vertically:
1. "角色" — opens bottom sheet with role info
2. "紙條" — opens note modal, badge shows remaining count (3→0)

### Bottom Sheet: Role Card

Slides up from bottom with backdrop blur:
- Drag handle bar at top
- Role name in crimson
- Passive ability description
- Active ability + use button
- Max height 50dvh

### Observer Mode

When player is "taken away" and transitions to observer:
- Dim banner at top: "👁️ 觀察者模式"
- FABs hidden
- Can still see events/results but cannot vote
- All interactive elements greyed out

### Component Structure

```
<GameProvider> (WebSocket + state management)
  <PersistentHeader /> (progress dots + stats)
  <AnimatePresence mode="wait">
    {currentScreen === 'join' && <JoinScreen />}
    {currentScreen === 'lobby' && <LobbyScreen />}
    {currentScreen === 'event' && <EventScreen />}
    {currentScreen === 'discussion' && <DiscussionScreen />}
    {currentScreen === 'voting' && <VotingScreen />}
    {currentScreen === 'result' && <ResultScreen />}
    {currentScreen === 'foreshadow' && <ForeshadowScreen />}
    {currentScreen === 'waiting' && <WaitingScreen />}
  </AnimatePresence>
  <SilenceOverlay /> (z-index: 50)
  <CoinFlipOverlay /> (z-index: 40)
  <TakenAwayOverlay /> (z-index: 45)
  <EndingOverlay /> (z-index: 60)
  <NoteReceivedOverlay /> (z-index: 35)
  <FABGroup />
  <RoleBottomSheet />
  <NoteModal />
  <TargetModal />
  <Toast />
</GameProvider>
```

### Animations (Framer Motion)

Screen transitions: `opacity: 0→1, y: 20→0` with `spring` type, 0.3s
Silence overlay: `opacity: 0→1` with 0.5s ease
Vote buttons: `whileTap={{ scale: 0.95 }}`, voted state with `layoutId` morph
Stats counter: `AnimatePresence` with exit `y: -20, opacity: 0` and enter `y: 20, opacity: 0→1`
Event title: Custom typewriter with `motion.span` per character, 30ms stagger
Taken away: `animate={{ x: [0, -5, 5, -5, 0] }}` shake + red vignette `opacity: 0→0.9`

### Data Types (TypeScript)

```typescript
interface GameState {
  screen: 'join' | 'lobby' | 'event' | 'discussion' | 'voting' | 'result' | 'foreshadow' | 'waiting';
  socialFear: number;
  thoughtFlow: number;
  myRisk: number;
  riskZone: 'safe' | 'caution' | 'danger' | 'taken';
  currentEvent: number; // 1-6
  role: { role_id: string; name: string; passive: string; ability: string } | null;
  choices: { key: string; label: string; description: string; disabled?: boolean }[];
  voted: boolean;
  votedChoice: string | null;
  isTakenAway: boolean;
  isObserver: boolean;
  noteRemaining: number;
  fearLevel: number; // 0-6, drives CSS theme
}
```

### Key UX Details

- All text is Traditional Chinese (zh-Hant)
- Zero English except code
- Mobile-first: 375px minimum width, touch targets ≥44px
- No system scrollbar visible — inner scroll areas use custom thin scrollbar (#333 thumb)
- Haptic feedback patterns (navigator.vibrate): vote=50ms, taken=[200,100,200,100,500], foreshadow=[100,50,100,50,300]
- Sound cues triggered at key moments (heartbeat during silence, click on vote, dissonant chord on foreshadow, ambient drone that intensifies with fear)

Generate the complete player-side UI with all screens, overlays, animations, and the WebSocket integration hook structure. Make it production-ready, not a demo.
