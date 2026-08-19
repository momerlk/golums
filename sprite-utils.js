function removeConnectedColor(pixels, width, height, color, tolerance) {
  const seen = new Uint8Array(width * height), queue = [];
  const matches = (index) => color.reduce((difference, value, channel) => difference + Math.abs(pixels[index * 4 + channel] - value), 0) <= tolerance;
  const add = (x, y) => { const point = y * width + x; if (!seen[point] && matches(point)) { seen[point] = 1; queue.push(point); } };
  for (let x = 0; x < width; x += 1) { add(x, 0); add(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { add(0, y); add(width - 1, y); }
  for (let head = 0; head < queue.length; head += 1) {
    const point = queue[head], x = point % width, y = Math.floor(point / width); pixels[point * 4 + 3] = 0;
    if (x) add(x - 1, y); if (x + 1 < width) add(x + 1, y); if (y) add(x, y - 1); if (y + 1 < height) add(x, y + 1);
  }
}

export function removeSpriteSheetBackground(pixels, width, height, tolerance = 12) {
  removeConnectedColor(pixels, width, height, [255, 255, 255], tolerance);
  const seen = new Uint8Array(width * height), minimumBackgroundSize = Math.max(1, Math.floor(width * height * .08));
  const matchesOrange = (point) => Math.abs(pixels[point * 4] - 255) + Math.abs(pixels[point * 4 + 1] - 127) + Math.abs(pixels[point * 4 + 2] - 39) <= tolerance;
  for (let point = 0; point < width * height; point += 1) {
    if (seen[point] || !matchesOrange(point)) continue;
    const component = [point]; seen[point] = 1;
    for (let head = 0; head < component.length; head += 1) {
      const current = component[head], x = current % width, y = Math.floor(current / width);
      for (const next of [x ? current - 1 : -1, x + 1 < width ? current + 1 : -1, y ? current - width : -1, y + 1 < height ? current + width : -1]) {
        if (next >= 0 && !seen[next] && matchesOrange(next)) { seen[next] = 1; component.push(next); }
      }
    }
    if (component.length >= minimumBackgroundSize) component.forEach((current) => { pixels[current * 4 + 3] = 0; });
  }
  return pixels;
}
