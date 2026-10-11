import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

export const LEVELS = [
  { id: 'roof', name: 'КРЫША', color1: '#1e1b4b', color2: '#312e81', kicker: 'Входная станция' },
  {
    id: 'agents',
    name: 'ЛАБОРАТОРИЯ АГЕНТОВ',
    color1: '#0f172a',
    color2: '#064e3b',
    kicker: 'Этаж 4',
  },
  {
    id: 'crm',
    name: 'СЕРВЕРНАЯ ИНТЕГРАЦИЙ',
    color1: '#1e1b4b',
    color2: '#2e1065',
    kicker: 'Этаж 3',
  },
  { id: 'booking', name: 'ЗАЛ РАСПИСАНИЙ', color1: '#022c22', color2: '#047857', kicker: 'Этаж 2' },
  {
    id: 'workshop',
    name: 'ЦЕХ ИНТЕРФЕЙСОВ',
    color1: '#1c1917',
    color2: '#44403c',
    kicker: 'Этаж 1',
  },
  {
    id: 'basement',
    name: 'ПУЛЬТ УПРАВЛЕНИЯ',
    color1: '#09090b',
    color2: '#27272a',
    kicker: 'Подвал',
  },
];

export async function generateBaselinePosters(outDir: string): Promise<void> {
  mkdirSync(outDir, { recursive: true });

  for (const lvl of LEVELS) {
    const svg = `
      <svg width="900" height="1200" viewBox="0 0 900 1200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${lvl.color1}" />
            <stop offset="100%" stop-color="${lvl.color2}" />
          </linearGradient>
          <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.15" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0.8" />
          </linearGradient>
        </defs>
        <rect width="900" height="1200" fill="url(#bg)" />
        <rect width="900" height="1200" fill="url(#glow)" />

        <!-- Tower grid motif -->
        <g stroke="#ffffff" stroke-opacity="0.05" stroke-width="1">
          <line x1="150" y1="0" x2="150" y2="1200" />
          <line x1="450" y1="0" x2="450" y2="1200" />
          <line x1="750" y1="0" x2="750" y2="1200" />
          <line x1="0" y1="300" x2="900" y2="300" />
          <line x1="0" y1="600" x2="900" y2="600" />
          <line x1="0" y1="900" x2="900" y2="900" />
        </g>

        <!-- Central architectural frame -->
        <rect x="250" y="350" width="400" height="500" rx="24" fill="#000000" fill-opacity="0.4" stroke="#ffffff" stroke-opacity="0.1" stroke-width="2" />
        <circle cx="450" cy="550" r="120" fill="#10b981" fill-opacity="0.08" stroke="#10b981" stroke-opacity="0.3" stroke-width="2" />

        <!-- Typography -->
        <text x="450" y="520" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" fill="#10b981" text-anchor="middle" letter-spacing="4">${lvl.kicker}</text>
        <text x="450" y="570" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="2">${lvl.name}</text>
        <text x="450" y="610" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="400" fill="#9ca3af" text-anchor="middle" letter-spacing="1">БАШНЯ • ПОСТЕР ЭТАЖА</text>
      </svg>
    `;

    const posterPath = resolve(outDir, `${lvl.id}.webp`);
    await sharp(Buffer.from(svg)).webp({ quality: 85 }).toFile(posterPath);

    console.log(`Generated poster: ${posterPath}`);
  }

  // Also generate Open Graph image
  const ogSvg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ogbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0a0a0c" />
          <stop offset="100%" stop-color="#18181b" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#ogbg)" />
      <circle cx="950" cy="315" r="280" fill="#10b981" fill-opacity="0.08" stroke="#10b981" stroke-opacity="0.2" stroke-width="2" />
      <g stroke="#ffffff" stroke-opacity="0.05" stroke-width="1">
        <line x1="0" y1="210" x2="1200" y2="210" />
        <line x1="0" y1="420" x2="1200" y2="420" />
        <line x1="400" y1="0" x2="400" y2="630" />
        <line x1="800" y1="0" x2="800" y2="630" />
      </g>
      <text x="100" y="240" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#10b981" letter-spacing="4">БАШНЯ / TOWER</text>
      <text x="100" y="320" font-family="system-ui, sans-serif" font-size="56" font-weight="900" fill="#ffffff" letter-spacing="-1">СТУДИЯ ИИ-АГЕНТОВ</text>
      <text x="100" y="390" font-family="system-ui, sans-serif" font-size="28" font-weight="400" fill="#a1a1aa">Автономные агенты • CRM • Бронирование • Веб</text>
    </svg>
  `;

  const ogPath = resolve(dirname(outDir), 'og-image.jpg');
  await sharp(Buffer.from(ogSvg)).jpeg({ quality: 90 }).toFile(ogPath);

  console.log(`Generated OG image: ${ogPath}`);
}

async function main() {
  const outDir = resolve(process.cwd(), 'public/posters');
  await generateBaselinePosters(outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
