export function removeConnectedBackground(pixels, width, height, tolerance = 12) {
  const background = [pixels[0], pixels[1], pixels[2]], seen = new Uint8Array(width * height), queue = [];
  const matches = (index) => Math.abs(pixels[index * 4] - background[0]) + Math.abs(pixels[index * 4 + 1] - background[1]) + Math.abs(pixels[index * 4 + 2] - background[2]) < tolerance;
  const add = (x, y) => { const point = y * width + x; if (!seen[point] && matches(point)) { seen[point] = 1; queue.push(point); } };
  for (let x = 0; x < width; x += 1) { add(x, 0); add(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { add(0, y); add(width - 1, y); }
  for (let head = 0; head < queue.length; head += 1) {
    const point = queue[head], x = point % width, y = Math.floor(point / width); pixels[point * 4 + 3] = 0;
    if (x) add(x - 1, y); if (x + 1 < width) add(x + 1, y); if (y) add(x, y - 1); if (y + 1 < height) add(x, y + 1);
  }
  return pixels;
}
