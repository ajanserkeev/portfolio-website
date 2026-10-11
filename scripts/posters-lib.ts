export interface PosterJob {
  id: string;
  url: string;
  out: string;
  width: number;
  height: number;
  format: 'webp' | 'jpeg';
  /** Shot mode keeps the desktop framing (room for the text column); zooming crops that margin. */
  zoom: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  left: number;
  top: number;
}

/**
 * Static-mode posters (one per level, 5:3 because a floor is about twice as wide as it is tall)
 * and the Open Graph image, shot with `?shot=`.
 */
export function posterJobs(base: string, levels: readonly string[]): PosterJob[] {
  const root = base.replace(/\/+$/, '');
  const shot = (id: string) => `${root}/?shot=${id}`;
  return [
    ...levels.map((id) => ({
      id,
      url: shot(id),
      out: `public/posters/${id}.webp`,
      width: 1200,
      height: 720,
      format: 'webp' as const,
      zoom: 1.6,
    })),
    {
      id: 'og',
      url: shot('agents'),
      out: 'public/og-image.jpg',
      width: 1200,
      height: 630,
      format: 'jpeg',
      zoom: 1.4,
    },
  ];
}

/** Centre region of a capture taken at `scale` device pixels per CSS pixel, magnified by `zoom`. */
export function centerCrop(viewport: Size, scale: number, zoom: number): Rect {
  const width = Math.round((viewport.width * scale) / zoom);
  const height = Math.round((viewport.height * scale) / zoom);
  return {
    left: Math.round((viewport.width * scale - width) / 2),
    top: Math.round((viewport.height * scale - height) / 2),
    width,
    height,
  };
}
