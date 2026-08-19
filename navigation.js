export const GRID_SIZE = 1024;
export const CELL_SIZE = 8;

export function movementSlices(distance, maxStep = CELL_SIZE / 2) { return Math.max(1, Math.ceil(distance / maxStep)); }
export function clampMapCenter(center, halfView, worldSize) { return halfView >= worldSize / 2 ? worldSize / 2 : Math.max(halfView, Math.min(worldSize - halfView, center)); }

export function isRoadColor(r, g, b) {
  const palePath = r > 218 && g > 222 && b > 225 && b > r + 7 && b > g + 5;
  const blueRoad = r >= 35 && r <= 135 && g >= 40 && g <= 145 && b >= 55 && b <= 175 && b > g + 3 && b > r + 6;
  return palePath || blueRoad;
}

export function isTrunkColor(r, g, b) {
  return r >= 60 && r <= 205 && g >= 25 && g <= 135 && b < 85 && r > g * 1.15 && g > b * 1.08;
}

export function isFoliageColor(r, g, b) {
  return r < 78 && g > r + 22 && g < 178 && b >= 40 && b < 105 && g > b + 28;
}

export function dilate(mask, width, passes = 2) {
  let result = mask;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = result.slice();
    for (let y = 1; y < width - 1; y += 1) for (let x = 1; x < width - 1; x += 1) if (result[y * width + x]) {
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) next[(y + dy) * width + x + dx] = 1;
    }
    result = next;
  }
  return result;
}

export function erode(mask, width, passes = 1) {
  let result = mask;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = result.slice();
    for (let y = 1; y < width - 1; y += 1) for (let x = 1; x < width - 1; x += 1) if (result[y * width + x]) {
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) if (!result[(y + dy) * width + x + dx]) { next[y * width + x] = 0; dy = 2; break; }
    }
    result = next;
  }
  return result;
}

export function closeOcclusions(mask, width, radius = 8) {
  const closed = erode(dilate(mask, width, radius), width, radius), result = mask.slice();
  for (let index = 0; index < result.length; index += 1) if (closed[index]) result[index] = 1;
  return result;
}

export function bridgeStraightGaps(mask, width, maxGap = 12) {
  const result = mask.slice();
  const bridgeLines = (vertical) => {
    for (let lane = 1; lane < width - 1; lane += 1) {
      let previous = -1;
      for (let position = 0; position < width; position += 1) {
        const index = vertical ? position * width + lane : lane * width + position;
        if (!mask[index]) continue;
        const gap = position - previous - 1;
        if (previous >= 0 && gap > 0 && gap <= maxGap) {
          let supportedLanes = 0;
          for (let offset = -2; offset <= 2; offset += 1) {
            const adjacentLane = lane + offset;
            if (adjacentLane < 0 || adjacentLane >= width) continue;
            const before = vertical ? previous * width + adjacentLane : adjacentLane * width + previous;
            const after = vertical ? position * width + adjacentLane : adjacentLane * width + position;
            if (mask[before] && mask[after]) supportedLanes += 1;
          }
          if (supportedLanes >= 2) for (let fill = previous + 1; fill < position; fill += 1) result[vertical ? fill * width + lane : lane * width + fill] = 1;
        }
        previous = position;
      }
    }
  };
  bridgeLines(false); bridgeLines(true); return result;
}

export function connectedFrom(mask, width, start) {
  const connected = new Uint8Array(mask.length), queue = [start]; connected[start] = 1;
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head], x = index % width, y = Math.floor(index / width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, next = ny * width + nx;
      if (nx >= 0 && ny >= 0 && nx < width && ny < width && mask[next] && !connected[next]) { connected[next] = 1; queue.push(next); }
    }
  }
  return connected;
}

export function nearestWalkable(mask, width, x, y) {
  x = Math.max(0, Math.min(width - 1, x)); y = Math.max(0, Math.min(width - 1, y));
  const origin = y * width + x; if (mask[origin]) return origin;
  for (let radius = 1; radius < width; radius += 1) {
    let best = -1, bestDistance = Infinity;
    const visit = (px, py) => { if (px < 0 || py < 0 || px >= width || py >= width) return; const index = py * width + px; if (!mask[index]) return; const distance = (px - x) ** 2 + (py - y) ** 2; if (distance < bestDistance || distance === bestDistance && index < best) { best = index; bestDistance = distance; } };
    for (let px = x - radius; px <= x + radius; px += 1) { visit(px, y - radius); visit(px, y + radius); }
    for (let py = y - radius + 1; py < y + radius; py += 1) { visit(x - radius, py); visit(x + radius, py); }
    if (best >= 0) return best;
  }
  return -1;
}

export function distanceToPath(x, y, path) {
  let closest = Infinity;
  for (let index = 1; index < path.length; index += 1) {
    const [ax, ay] = path[index - 1], [bx, by] = path[index], dx = bx - ax, dy = by - ay;
    const length = dx * dx + dy * dy, amount = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0;
    closest = Math.min(closest, Math.hypot(x - ax - amount * dx, y - ay - amount * dy));
  }
  return closest;
}

export function trimPathToPlayer(path, x, y) {
  if (path.length < 2) return path;
  let closest = Infinity, segment = 0, point = path[0];
  for (let index = 1; index < path.length; index += 1) {
    const [ax, ay] = path[index - 1], [bx, by] = path[index], dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
    const amount = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0, projected = [ax + amount * dx, ay + amount * dy], distance = Math.hypot(x - projected[0], y - projected[1]);
    if (distance < closest) { closest = distance; segment = index; point = projected; }
  }
  return [point, ...path.slice(segment)];
}

class MinHeap {
  constructor() { this.items = []; }
  push(value, priority) { const item = { value, priority }; this.items.push(item); let i = this.items.length - 1; while (i) { const parent = Math.floor((i - 1) / 2); if (this.items[parent].priority <= priority) break; this.items[i] = this.items[parent]; i = parent; } this.items[i] = item; }
  pop() { if (!this.items.length) return null; const root = this.items[0], last = this.items.pop(); if (this.items.length) { let i = 0; while (true) { let child = i * 2 + 1; if (child >= this.items.length) break; if (child + 1 < this.items.length && this.items[child + 1].priority < this.items[child].priority) child += 1; if (this.items[child].priority >= last.priority) break; this.items[i] = this.items[child]; i = child; } this.items[i] = last; } return root.value; }
}

export function findGridPath(mask, width, start, goal) {
  if (start < 0 || goal < 0 || !mask[start] || !mask[goal]) return [];
  const open = new MinHeap(), closed = new Uint8Array(mask.length), cameFrom = new Int32Array(mask.length).fill(-1), cost = new Float32Array(mask.length).fill(Infinity); cost[start] = 0; open.push(start, 0);
  const moves = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (open.items.length) {
    const current = open.pop(); if (closed[current]) continue; closed[current] = 1; if (current === goal) break; const x = current % width, y = Math.floor(current / width);
    for (const [dx, dy, moveCost] of moves) {
      const nx = x + dx, ny = y + dy, next = ny * width + nx; if (nx < 0 || ny < 0 || nx >= width || ny >= width || !mask[next]) continue;
      if (dx && dy && (!mask[y * width + nx] || !mask[ny * width + x])) continue;
      const nextCost = cost[current] + moveCost; if (nextCost >= cost[next]) continue; cost[next] = nextCost; cameFrom[next] = current;
      const hx = Math.abs(goal % width - nx), hy = Math.abs(Math.floor(goal / width) - ny), heuristic = Math.max(hx, hy) + .414 * Math.min(hx, hy); open.push(next, nextCost + heuristic);
    }
  }
  if (start !== goal && cameFrom[goal] < 0) return [];
  const path = [goal]; while (path[path.length - 1] !== start) path.push(cameFrom[path[path.length - 1]]); path.reverse(); return path.filter((index, position) => {
    if (!position || position === path.length - 1) return true; const a = path[position - 1], b = path[position], c = path[position + 1]; return (b % width - a % width) !== (c % width - b % width) || (Math.floor(b / width) - Math.floor(a / width)) !== (Math.floor(c / width) - Math.floor(b / width));
  });
}
