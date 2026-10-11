import { describe, expect, it } from 'vitest';
import { centerCrop, posterJobs } from './posters-lib';

describe('posterJobs', () => {
  it('shoots every level in a wide 5:3 frame and the OG image from the agents floor', () => {
    expect(posterJobs('http://localhost:4321', ['roof', 'agents'])).toEqual([
      {
        id: 'roof',
        url: 'http://localhost:4321/?shot=roof',
        out: 'public/posters/roof.webp',
        width: 1200,
        height: 720,
        format: 'webp',
        zoom: 1.6,
      },
      {
        id: 'agents',
        url: 'http://localhost:4321/?shot=agents',
        out: 'public/posters/agents.webp',
        width: 1200,
        height: 720,
        format: 'webp',
        zoom: 1.6,
      },
      {
        id: 'og',
        url: 'http://localhost:4321/?shot=agents',
        out: 'public/og-image.jpg',
        width: 1200,
        height: 630,
        format: 'jpeg',
        zoom: 1.4,
      },
    ]);
  });

  it('drops a trailing slash from the base URL', () => {
    expect(posterJobs('http://host:1/', ['roof'])[0]?.url).toBe('http://host:1/?shot=roof');
  });

  it('crops the centre of a high-density capture to zoom in without losing sharpness', () => {
    expect(centerCrop({ width: 1200, height: 720 }, 2, 1.6)).toEqual({
      left: 450,
      top: 270,
      width: 1500,
      height: 900,
    });
    expect(centerCrop({ width: 1200, height: 720 }, 2, 1)).toEqual({
      left: 0,
      top: 0,
      width: 2400,
      height: 1440,
    });
  });
});
