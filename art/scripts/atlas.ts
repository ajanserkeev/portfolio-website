export interface AtlasItem {
  id: string;
  width: number;
  height: number;
}

export interface AtlasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AtlasLayout {
  width: number;
  height: number;
  rects: Record<string, AtlasRect>;
}

/** Shelf packing: tallest first, left to right, a new shelf when a row is full. */
export function packAtlas(items: readonly AtlasItem[], maxWidth: number, padding = 8): AtlasLayout {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`duplicate atlas id "${item.id}"`);
    ids.add(item.id);
    if (item.width + 2 * padding > maxWidth)
      throw new Error(`"${item.id}" is wider than the atlas`);
  }
  const sorted = [...items].sort((a, b) => b.height - a.height || a.id.localeCompare(b.id));
  const rects: Record<string, AtlasRect> = {};
  let x = padding;
  let y = padding;
  let shelf = 0;
  for (const item of sorted) {
    if (x + item.width + padding > maxWidth) {
      x = padding;
      y += shelf + padding;
      shelf = 0;
    }
    rects[item.id] = { x, y, width: item.width, height: item.height };
    x += item.width + padding;
    shelf = Math.max(shelf, item.height);
  }
  return { width: maxWidth, height: Math.ceil((y + shelf + padding) / 4) * 4, rects };
}
