# Go LUMS! — Fast Implementation Plan

## Goal

Build a browser-based, top-down 2D campus experience inspired by the feel of classic handheld creature-adventure games: walk around LUMS, discover landmarks, meet a few campus characters, and fill a **CampusDex**.

This first version is an interactive campus game, not a navigation service or student-life simulator.

## Playable MVP

A player can:

- Enter through the In Gate and walk around the full pixel campus.
- Move with WASD/arrow keys or an on-screen mobile D-pad.
- Collide with major buildings and map edges instead of walking through them.
- Approach landmarks and press `E`/tap **Interact** to discover them.
- Read short, funny descriptions and collect a stamp for each discovery.
- Talk to 4–6 stationary student/NPC characters.
- Open a CampusDex showing discovered and undiscovered places.
- Use a location directory to focus the camera on a landmark without teleporting the player.
- Keep discoveries and settings after refresh using `localStorage`.

## Explicit Non-goals

Do not build these in the first version:

- Indoor maps or real GPS positioning
- Turn-by-turn navigation
- Multiplayer, chat, accounts, or a backend
- Combat, inventory, currency, shops, or a quest framework
- Procedural maps or a general-purpose level editor
- Multiple campuses, seasons, or day/night simulation
- Perfect collision around every tree and decorative object

Add these only after students enjoy the walking-and-discovery loop.

## Asset Roles

| Asset | Use |
|---|---|
| `assets/pixel_map.png` | The 4096×4096 playable world background |
| `assets/labelled_pixel_map.png` | Primary reference for landmark names and positions; never shown during play |
| `assets/official_map.png` | Cross-check campus identity and relative building placement |
| `assets/satelite_map.png` | Cross-check paths and central-campus landmarks |

The pixel map already contains the world art. Do not rebuild it as a tilemap for the MVP.

## Technical Approach

- **Runtime:** Phaser 3
- **Project shell:** static HTML + ES modules; Phaser loads from its CDN so the first build has no install or build step
- **Physics:** Phaser Arcade Physics
- **World:** one background image at native 4096×4096 resolution
- **Player:** one small four-direction sprite sheet; reuse frames for walking
- **Collision and routes:** one walkability mask derived from the actual pale-path and blue-road pixels
- **Interactions:** distance checks against landmark/NPC points
- **Save data:** one versioned `localStorage` object
- **UI:** semantic HTML overlays for dialogue, directory, CampusDex, controls, and settings

Why Phaser: it already provides keyboard/touch input, cameras, sprites, animation, and collision. Building those separately would take longer than the game. Move to Vite only if the asset pipeline or source structure grows beyond this MVP.

## Core Game Loop

```text
Enter campus → explore → notice landmark/NPC → interact
      ↑                                           ↓
      └──── choose another place ← earn stamp / dialogue
```

The loop must feel good before adding more systems.

## World Data

Keep editable campus content in one file:

```js
export const landmarks = [
  {
    id: 'library',
    name: 'Gad & Birgit Rausing Library',
    shortName: 'Library',
    x: 2550,
    y: 3330,
    radius: 100,
    description: 'Quiet floors, deadline panic, and suspiciously productive people.',
    icon: 'book',
  },
];
```

Use the labelled map to record pixel coordinates for:

- A — Suleman Dawood School of Business
- B — Academic Block / MGSHSS
- C — SBASSE
- D — SAHSOL
- E — School of Education
- F — REDC
- G — Library
- H — Executive Dining Centre
- I — Mosque
- J — Male Hostels
- K — Female Hostels
- L — Super Store / ATM
- M — Tennis Court
- N — Volleyball Court
- O — Sports Complex
- P — Cricket Ground
- Q — Aquatic Centre
- R — Vigilance Office
- S — Free Parking
- T — Visitor Parking
- U — Football Ground
- W — VC House
- X — Daycare Centre
- Y — In Gate
- Z — Out Gate

The labelled map includes `V — Hockey Ground` in its legend, but no visible `V` marker. Leave it out until its position is confirmed.

## Game Feel

These small touches create most of the fun:

- Camera softly follows the player with slight look-ahead.
- Walking has a four-frame animation and tiny dust puffs.
- Grass/road footsteps use two subtle sound variations.
- Interaction prompts bounce once when entering range.
- Landmark discovery briefly freezes movement, plays a chime, and shows a stamp card.
- A few leaves, birds, or butterflies use simple looping paths.
- NPC dialogue uses short campus-specific jokes, never long paragraphs.
- Pixel-perfect rendering: nearest-neighbour scaling and integer camera zoom.

Use original or clearly licensed sprites/audio. Copy the era's interaction language, not Pokémon characters, names, music, or assets.

## Screen Layout

### Desktop

- Game fills the viewport.
- Top-left: current area name.
- Top-right: rotating local minimap; CampusDex and mute controls remain accessible.
- Bottom-right: contextual `E Interact` prompt.
- `M`: directory/map overlay.
- `Esc`: pause/settings.

### Mobile

- Full-screen landscape is preferred, portrait remains playable.
- Bottom-left: transparent four-way D-pad.
- Bottom-right: one large action button.
- UI stays inside safe-area insets.

## NPC Set for MVP

Use six fixed NPCs with 2–3 lines each:

1. Gate guard — welcomes the player and teaches movement.
2. Sleep-deprived student near Academic Block — introduces CampusDex.
3. Library regular — jokes about finding a seat.
4. Sports student near the complex — points out grounds and courts.
5. Hostel resident — hints at discovering both hostel areas.
6. Lost freshman — prompts the player to use the directory.

NPCs do not need schedules, branching dialogue, or quests yet.

## File Structure

```text
lums_map/
├── assets/
│   ├── pixel_map.png
│   ├── labelled_pixel_map.png
│   ├── official_map.png
│   ├── satelite_map.png
│   └── game/                 # player, NPC, UI, and audio assets only
├── app.js                     # one CampusScene while the game has one map
├── game-data.js               # exact labelled-map markers and NPC content
├── navigation.js              # pixel mask, connected roads, and A* routing
├── styles.css
├── index.html
└── package.json
```

Do not split scenes or systems further until a second playable area exists.

## Build Order

### Milestone 1 — Walk the campus (2–3 hours)

- Add the static game shell and Phaser CDN runtime.
- Load `pixel_map.png` as the world.
- Add player spawn at In Gate.
- Add keyboard movement, camera follow, bounds, and pixel rendering.
- Add mobile controls.

**Proof:** The player can reach all map regions on desktop and mobile.

### Milestone 2 — Make the map believable (2–4 hours)

- Derive walkable pixels from `pixel_map.png` and reuse them for movement and A* routes.
- Add area-name triggers and interaction prompts.
- Add the directory overlay with camera focus.
- Record all confirmed landmark coordinates in `campus.js`.

**Proof:** The player cannot cross major buildings and can identify every confirmed landmark.

### Milestone 3 — Make it fun (3–4 hours)

- Add CampusDex discoveries and local save.
- Add discovery cards, sounds, particles, and progress count.
- Add the six NPCs and short dialogue.
- Add pause, mute, restart-save, and controls help.

**Proof:** A fresh player can discover three places, talk to an NPC, refresh, and retain progress.

### Milestone 4 — Ship (1–2 hours)

- Compress large images without changing dimensions.
- Test Chrome/Safari on phone and laptop.
- Fix touch controls, camera scaling, and text overflow.
- Deploy as a static site.

**Proof:** The first meaningful frame appears quickly on campus Wi-Fi and the complete loop works without a server.

## Acceptance Checklist

- [ ] Player starts at In Gate and movement feels responsive.
- [ ] Camera never leaves the map.
- [ ] Major buildings block movement.
- [ ] Keyboard and touch controls work.
- [ ] At least 20 confirmed landmarks are discoverable.
- [ ] Six NPCs can be spoken to.
- [ ] CampusDex progress survives refresh.
- [ ] Directory can locate every landmark.
- [ ] Game works at common phone and laptop sizes.
- [ ] No copyrighted Pokémon assets or audio are used.
- [ ] No backend or account is required.

## Stop Condition

Stop the MVP when a student can enter through the gate, walk around, discover landmarks, talk to NPCs, and retain CampusDex progress. Share that build with students before adding quests, classes, shops, or multiplayer.

## Best Next Expansion

If the MVP is fun, add **one short orientation quest**: the gate guard asks the player to discover the Academic Block, Library, Mosque, and Sports Complex. This tests whether structured progression adds value without creating a full quest engine.
