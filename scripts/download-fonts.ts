import fs from 'node:fs';
import path from 'node:path';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Unbounded:wght@700&family=Manrope:wght@400;600&family=JetBrains+Mono:wght@500&display=swap';

interface FontFace {
  family: string;
  weight: string;
  subset: string;
  url: string;
}

async function main() {
  const fontsDir = path.resolve(process.cwd(), 'public', 'fonts');
  fs.mkdirSync(fontsDir, { recursive: true });

  const css = await fetch(FONTS_URL, { headers: { 'User-Agent': USER_AGENT } }).then((r) =>
    r.text(),
  );

  const faces: FontFace[] = [];
  const blocks = css.split('@font-face');

  for (const block of blocks) {
    if (!block.trim()) continue;
    const subsetMatch = block.match(/\/\*\s*([a-z-]+)\s*\*\//);
    const subset = subsetMatch ? subsetMatch[1] : 'latin';
    if (subset !== 'latin' && subset !== 'cyrillic') continue;

    const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)['"]?/);
    const weightMatch = block.match(/font-weight:\s*([^;]+);/);
    const urlMatch = block.match(/url\((https:[^)]+\.woff2)\)/);

    const family = familyMatch?.[1];
    const weight = weightMatch?.[1];
    const url = urlMatch?.[1];

    if (family && weight && url) {
      faces.push({
        family: family.trim(),
        weight: weight.trim(),
        subset,
        url,
      });
    }
  }

  let fontsCss = '/* Self-hosted fonts: Unbounded, Manrope, JetBrains Mono */\n\n';

  for (const face of faces) {
    const slug = face.family.toLowerCase().replace(/\s+/g, '-');
    const filename = `${slug}-${face.weight}-${face.subset}.woff2`;
    const targetFile = path.join(fontsDir, filename);

    console.log(`Downloading ${filename} from ${face.url}...`);
    const buffer = await fetch(face.url).then((r) => r.arrayBuffer());
    fs.writeFileSync(targetFile, Buffer.from(buffer));

    const unicodeRange =
      face.subset === 'cyrillic'
        ? 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116'
        : 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

    fontsCss += `@font-face {
  font-family: '${face.family}';
  font-style: normal;
  font-weight: ${face.weight};
  font-display: swap;
  src: url('/fonts/${filename}') format('woff2');
  unicode-range: ${unicodeRange};
}\n\n`;
  }

  const cssPath = path.resolve(process.cwd(), 'src', 'styles', 'fonts.css');
  fs.writeFileSync(cssPath, fontsCss);
  console.log(`Wrote fonts to ${fontsDir} and stylesheet to ${cssPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
