import { spawnSync } from 'node:child_process';
import { removeSpriteSheetBackground } from './sprite-utils.js';

const source = 'assets/Game Boy Advance - Pokemon FireRed _ LeafGreen - Playable Characters - Player Sprites.png';
const portraits = [
  ['character-red.png', 498, 180, 96, 115],
  ['character-leaf.png', 496, 444, 100, 114],
];

for (const [name, x, y, width, height] of portraits) {
  const decoded = spawnSync('ffmpeg', ['-loglevel','error','-i',source,'-vf',`crop=${width}:${height}:${x}:${y}`,'-f','rawvideo','-pix_fmt','rgba','pipe:1']);
  if (decoded.status) throw new Error(decoded.stderr.toString());
  const pixels = decoded.stdout;
  removeSpriteSheetBackground(pixels, width, height);
  const encoded = spawnSync('ffmpeg', ['-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',`${width}x${height}`,'-i','pipe:0','-frames:v','1',`assets/${name}`], { input: pixels });
  if (encoded.status) throw new Error(encoded.stderr.toString());
}

console.log('Extracted Red and Leaf portraits with edge-connected sheet backgrounds removed.');
