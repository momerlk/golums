import { spawnSync } from 'node:child_process';
import { isFoliageColor } from './navigation.js';

const TILE_SIZE = 512, WORLD_SIZE = TILE_SIZE * 2;
const tiles = [['r1_c1', 0, 0], ['r1_c2', 1, 0], ['r2_c1', 0, 1], ['r2_c2', 1, 1]];
const canopy = new Uint8Array(WORLD_SIZE * WORLD_SIZE * 4);

for (const [id, column, row] of tiles) {
  const decoded = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', `assets/pixel_map/${id}.webp`, '-vf', `scale=${TILE_SIZE}:${TILE_SIZE}:flags=neighbor`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { maxBuffer: TILE_SIZE * TILE_SIZE * 4 });
  if (decoded.status) throw new Error(decoded.stderr.toString() || `Could not read ${id}.webp`);
  for (let y = 0; y < TILE_SIZE; y += 1) for (let x = 0; x < TILE_SIZE; x += 1) {
    const source = (y * TILE_SIZE + x) * 3, target = ((row * TILE_SIZE + y) * WORLD_SIZE + column * TILE_SIZE + x) * 4;
    const r = decoded.stdout[source], g = decoded.stdout[source + 1], b = decoded.stdout[source + 2];
    if (isFoliageColor(r, g, b)) { canopy[target] = r; canopy[target + 1] = g; canopy[target + 2] = b; canopy[target + 3] = 255; }
  }
}

const encoded = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${WORLD_SIZE}x${WORLD_SIZE}`, '-i', 'pipe:0', '-frames:v', '1', 'assets/pixel_map/canopy-overlay.png'], { input: canopy, maxBuffer: WORLD_SIZE * WORLD_SIZE * 5 });
if (encoded.status) throw new Error(encoded.stderr.toString() || 'Could not write canopy overlay');
console.log('Generated 1024×1024 tree-canopy overlay.');
