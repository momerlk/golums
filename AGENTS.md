# Go LUMS! Development Guide

## Product

Go LUMS! is a lightweight Phaser 3 campus-exploration game. Players create a character, enter through LUMS In Gate, discover landmarks, talk to NPCs, navigate with routes and waypoints, and build a CampusDex. The game supports desktop keyboards and touch controls.

Preserve the existing pixel-art Game Boy Advance-inspired visual language, direct wording, and low-dependency architecture.

## Repository Layout

- `index.html`: document structure, HUD, profile creation, controls, dialogs, and panels.
- `styles.css`: all responsive UI and game-shell styling.
- `app.js`: Phaser scene, player/NPC rendering, UI events, onboarding, persistence, maps, and routing integration.
- `game-data.js`: world constants, landmarks, NPC definitions, and save-data validation helpers.
- `navigation.js`: walkability processing, pathfinding, route progression, and map-coordinate helpers.
- `sprite-utils.js`: shared sprite-sheet background removal.
- `test-game-data.mjs`: focused frontend data, navigation, and sprite regression checks.
- `assets/pixel_map/`: map tiles, canopy overlay, and generated map metadata.
- `assets/sprites/`: additional NPC sprite sheets.
- `backend/`: Express API, MongoDB connection, tests, and Cloud Run environment configuration.
- `build-player-portraits.mjs`: extracts player portraits from the Pokémon-style source sheet.
- `build-canopy.mjs`: rebuilds the map canopy overlay.

## Local Development

Requirements:

- Node.js 22 or compatible modern Node.js.
- Python 3 for the simple static development server.

Commands:

```sh
python3 -m http.server 8081
npm test
node --check app.js
npm run build:players
npm run build:canopy
npm test --prefix backend
npm start --prefix backend
```

Open `http://localhost:8081/`. Do not open `index.html` directly with `file://`; ES modules and API requests require an HTTP origin.

The frontend API URL is supplied by the `golums-api-url` meta tag in `index.html`.

## Frontend Architecture

The frontend intentionally uses plain HTML, CSS, JavaScript modules, and Phaser. Do not add a framework, bundler, component library, state library, or package for behavior already covered by the browser or Phaser.

`app.js` owns one shared runtime `state` object. Keep state changes routed through the existing helpers:

- `loadSave()` restores local progress.
- `save()` writes local progress and schedules remote persistence.
- `syncRemote()` loads the phone-owned remote player.
- `progressPayload()` defines the frontend/backend progress contract.
- `updateHud()` derives HUD content from current game state.
- `openPanel()` and `openDialogue()` own dialog behavior.

Avoid duplicating these responsibilities in event handlers.

## Player Identity and Persistence

- Normalized Pakistani phone number (`+923XXXXXXXXX`) is the unique player identifier.
- One MongoDB document represents one phone number.
- Character, discoveries, position, sound, bike mode, and timestamps must save together.
- Local storage remains the offline fallback.
- Remote failures must never erase valid local progress.
- The current save format is version `8`; preserve backward loading unless deliberately migrating it.
- Do not treat phone identity as authentication. Adding protected accounts requires a separate OTP or login flow.

When changing saved fields, update all of the following together:

1. Frontend `state` defaults.
2. `loadSave()`.
3. `save()`.
4. `progressPayload()`.
5. Backend `validateProgress()`.
6. Backend tests.
7. Save version or compatibility handling when required.

## Game World and Movement

- World size is `8192 × 8192`.
- The map is divided into four `4096 × 4096` tiles.
- Navigation uses an `8px` cell grid.
- Player coordinates represent the character's feet, not the sprite center.
- Keep the player sprite and shadow anchored to the same world position.
- Collision checks must use `canStand()` and the generated walkability mask.
- Movement is sliced to prevent tunneling through narrow blocked areas.

Do not bypass the walkability grid by directly assigning arbitrary player coordinates.

## Routes, Waypoints, and Maps

- `findGridPath()` owns A* pathfinding.
- `trimPathToPlayer()` advances a route as the player moves.
- `setRoute()` is the shared entry point for CampusDex destinations and custom waypoints.
- The in-game route and full-map route must render from the live player position.
- Custom map clicks must be converted through `fullMapTransform()` and snapped with `nearestWorld()`.
- Preserve route cleanup on arrival and rerouting when the player leaves the path.

Pathfinding changes require a focused assertion in `test-game-data.mjs`.

## Sprites and NPCs

- Player walking and bike textures are extracted at runtime from the tracked source sheet.
- Portrait generation and runtime extraction share `removeSpriteSheetBackground()`.
- Do not globally key orange or white pixels; background removal must preserve similarly colored character details.
- Use pixel-perfect rendering and disable smoothing for generated sprite canvases.
- Add NPC definitions to `npcs` in `game-data.js`.
- Place NPCs through `nearestWorld()` so they remain reachable.
- Nasir Khan Jan is the introductory guide at In Gate and owns the first-run tutorial dialogue.

When adding a sprite sheet, document or encode exact source crop coordinates beside its extraction code.

## Controls and Accessibility

Desktop controls:

- WASD or arrow keys: move.
- E or Space: interact.
- M: open CampusDex.
- Escape: close panels.

Touch controls:

- D-pad: move.
- A: interact or zoom in on the full map.
- B: open CampusDex or zoom out on the full map.

Rules:

- Game shortcuts must not fire while typing in form fields.
- Movement must pause while a modal dialog is open.
- Buttons need accessible names and visible keyboard focus.
- Dialogs need labelled titles and working close controls.
- Do not make the profile form submit natively before the game is ready.

## Backend

The backend is an Express 5 service using the official MongoDB driver.

Endpoints:

- `GET /health`: service health check.
- `POST /api/progress/load`: load a player by normalized phone; legacy email reads remain temporarily compatible.
- `PUT /api/progress`: validate and replace/upsert the complete player document.

Database:

- Database: `golums`.
- Collection: `players`.
- MongoDB `_id`: normalized phone for new players; legacy email documents remain readable.

Trust-boundary rules:

- Validate every request body before database access.
- Reject unknown gender values, invalid usernames or phone numbers, malformed positions, invalid landmark IDs, and invalid timestamps.
- Keep request bodies size-limited.
- Never log secrets or full MongoDB connection strings.
- CORS currently permits all origins and credentials are disabled.

## Deployment

Cloud Run configuration:

- Google Cloud project: `juno786`.
- Region: `asia-south1`.
- Service: `golums-api`.
- Public URL: `https://golums-api-60252382487.asia-south1.run.app`.
- Secret Manager secret: `golums-mongodb-uri`.
- Runtime database variable: `MONGODB_DATABASE=golums`.

Deploy from the repository root:

```sh
gcloud run deploy golums-api \
  --source backend \
  --project juno786 \
  --region asia-south1 \
  --allow-unauthenticated \
  --env-vars-file backend/cloudrun.env.yaml \
  --set-secrets MONGODB_URI=golums-mongodb-uri:1
```

After deploying, verify `/health`, an arbitrary-origin CORS preflight, and the new ready revision. Do not commit or paste the MongoDB URI into source files, logs, documentation, or commands.

## Development Rules

- Read the complete flow and all callers before editing shared behavior.
- Make the smallest complete change at the layer that owns the behavior.
- Reuse existing helpers, data structures, dialogs, and visual patterns.
- Prefer browser APIs, standard JavaScript, CSS, and Phaser over new dependencies.
- Preserve unrelated user changes in a dirty worktree.
- Use `apply_patch` for source edits.
- Do not delete, reset, or overwrite unrelated work.
- Avoid speculative abstractions, configuration, and scaffolding.
- Keep generated assets reproducible through their existing build scripts.
- Add one focused regression check for any non-trivial branch, loop, parser, pathfinding, persistence, or security change.
- Never weaken validation, error handling that protects progress, accessibility basics, or secret handling.

## Completion Checklist

Run the checks relevant to the change, then at minimum:

```sh
node --check app.js
npm test
git diff --check
```

For UI changes, test both desktop and narrow touch layouts. For backend changes, run backend tests and verify the deployed endpoint when deployment was requested. Stop after the requested behavior works; do not bundle unrelated cleanup.
