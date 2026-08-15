import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { WORLD_SIZE, SPAWN, applyMapData, landmarks, npcs, validSavedPosition } from './game-data.js';
import { bridgeStraightGaps, clampMapCenter, closeOcclusions, connectedFrom, dilate, distanceToPath, findGridPath, isFoliageColor, isRoadColor, isTrunkColor, movementSlices, nearestWalkable } from './navigation.js';
import { removeConnectedBackground } from './sprite-utils.js';

const mapData = JSON.parse(readFileSync('assets/pixel_map/master.json'));
applyMapData(mapData);
assert.equal(WORLD_SIZE, 8192);
assert.equal(landmarks.length, mapData.landmarks.filter((item) => item.quest_target).length);
assert.deepEqual([SPAWN.x, SPAWN.y], [1784, 7920]);
assert.equal(validSavedPosition([SPAWN.x, SPAWN.y]), true);
assert.equal(validSavedPosition([-1, SPAWN.y]), false);
assert.equal(validSavedPosition(['1784', SPAWN.y]), false);
assert.ok(landmarks.every(({ x, y, id, labels }) => id && labels.length && x > 0 && x < WORLD_SIZE && y > 0 && y < WORLD_SIZE));
assert.equal(npcs.length, 4);
assert.equal(mapData.tiles.length, 4);
assert.ok(mapData.tiles.every(({ id }) => existsSync(`assets/pixel_map/${id}.png`)));
assert.equal(mapData.walkability.width, 1024);
assert.equal(mapData.walkability.rows.length, 1024);
assert.equal(mapData.landmarks.find(({letter}) => letter === 'K').label_points_global.length, 3);
assert.equal(mapData.landmarks.some(({letter}) => letter === 'V'), false);
assert.equal(existsSync('assets/Game Boy Advance - Pokemon FireRed _ LeafGreen - Playable Characters - Player Sprites.png'), true);
assert.equal(isRoadColor(232, 241, 251), true);
assert.equal(isRoadColor(255, 255, 255), false);
assert.equal(isRoadColor(68, 80, 114), true);
assert.equal(isRoadColor(89, 177, 47), false);
assert.equal(isRoadColor(209, 209, 209), false);
assert.equal(isFoliageColor(37, 142, 55), true);
assert.equal(isFoliageColor(89, 175, 47), false);
assert.equal(isTrunkColor(132, 78, 43), true);
assert.equal(movementSlices(24), 6);
assert.equal(clampMapCenter(-100, 500, 8192), 500);
assert.equal(clampMapCenter(9000, 500, 8192), 7692);
assert.equal(clampMapCenter(2000, 5000, 8192), 4096);

const cross = new Uint8Array([
  0, 0, 1, 0, 0,
  0, 0, 1, 0, 0,
  1, 1, 1, 1, 1,
  0, 0, 1, 0, 0,
  0, 0, 1, 0, 0,
]);
assert.equal(connectedFrom(cross, 5, 10).reduce((sum, value) => sum + value, 0), 9);
assert.equal(dilate(cross, 5, 1)[6], 1);
assert.equal(nearestWalkable(cross, 5, 0, 0), 2);
assert.equal(distanceToPath(5, 5, [[0, 0], [10, 0]]), 5);
assert.ok(findGridPath(cross, 5, 10, 14).length >= 2);
assert.deepEqual(findGridPath(cross, 5, 0, 14), []);

const treeGap = new Uint8Array(81);
for (const y of [3, 4, 5]) for (const x of [1, 2, 6, 7]) treeGap[y * 9 + x] = 1;
const bridged = bridgeStraightGaps(treeGap, 9, 4);
assert.equal(bridged[4 * 9 + 4], 1);
const thinGap = new Uint8Array(81); for (const x of [1, 2, 6, 7]) thinGap[4 * 9 + x] = 1;
assert.equal(bridgeStraightGaps(thinGap, 9, 4)[4 * 9 + 4], 0);
const canopyGap = new Uint8Array(225); for (let y = 5; y <= 9; y += 1) for (const x of [2, 3, 4, 10, 11, 12]) canopyGap[y * 15 + x] = 1;
assert.equal(closeOcclusions(canopyGap, 15, 4)[7 * 15 + 7], 1);
const keyed = new Uint8ClampedArray(5 * 5 * 4).fill(255); for (let index = 0; index < 25; index += 1) { keyed[index * 4] = 255; keyed[index * 4 + 1] = 127; keyed[index * 4 + 2] = 39; }
for (let y = 1; y <= 3; y += 1) for (let x = 1; x <= 3; x += 1) if (x !== 2 || y !== 2) { const pixel = (y * 5 + x) * 4; keyed[pixel] = keyed[pixel + 1] = keyed[pixel + 2] = 0; }
removeConnectedBackground(keyed, 5, 5);
assert.equal(keyed[3], 0);
assert.equal(keyed[(2 * 5 + 2) * 4 + 3], 255);
console.log('LUMS Quest pixel-road collision, A* routing, labels, and world data are valid.');
