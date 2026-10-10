# План 01 — Фундамент и «серая» башня

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Для других инструментов (Cursor, Copilot и т. п.):** выполняйте задачи строго по порядку. Внутри задачи: тест → проверка, что падает → код → проверка, что проходит → коммит. Отмечайте `- [x]`.

**Goal:** Статический сайт-башня из 6 этажей-заглушек. Обычный скролл везёт камеру-лифт, этажи стримятся, уровень качества выбирается автоматически, работают режим «без 3D» и reduced motion. Всё покрыто тестами, бюджеты проверяются в CI.

**Architecture:** Astro отдаёт HTML-слой с текстом (первый экран без JS). Маленький `boot.ts` выбирает уровень качества и, если 3D уместно, лениво подгружает движок на three.js. Движок — набор чистых модулей (лифт, кадр, стриминг, цикл рендера) с юнит-тестами плюс тонкий слой склейки (`app.ts`), проверяемый e2e в Chromium через SwiftShader.

**Tech Stack:** Astro 7.3.8 · TypeScript 6.0.3 · three 0.186.1 · Tailwind CSS 4.3.3 · Vitest 5.0.3 · Playwright 1.64.0 · Biome 2.5.15 · zod 4.6.5 (только в тестах) · Node ≥ 24 · pnpm 12

**Spec:** `docs/01-brief.md` (бриф), `docs/02-implementation-plan.md` (контракты, раздел 3)

## Global Constraints

- Node ≥ 24, pnpm 12. Скрипты на TypeScript запускаются через `tsx` (без отдельной сборки).
- Версии фиксированы: `astro 7.3.8`, `three 0.186.1`, `typescript 6.0.3`. Не 7.x: `@astrojs/check` поддерживает только `^5 || ^6`.
- Бюджеты: HTML + CSS + JS до старта 3D ≤ 120 КБ gzip; JS 3D-движка ≤ 200 КБ gzip; draw calls ≤ 60 за кадр; LCP ≤ 2,0 с; CLS ≤ 0,05; Lighthouse mobile ≥ 90.
- В 3D-пути нет React Three Fiber, GSAP и Lenis. Рендерер — только `WebGLRenderer` (WebGL2).
- Pixel ratio: High ≤ 2, Lite = 1.
- Весь текст — в `src/i18n/ru.ts` и `src/i18n/en.ts`. Слов внутри 3D нет.
- `prefers-reduced-motion` → камера переключается сменой кадра (cut), без фоновых анимаций.
- Canvas имеет `aria-hidden="true"`; у каждого 3D-действия есть DOM-двойник.
- Доступ к `localStorage`/`sessionStorage` — только в `try/catch`.
- TypeScript: `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly` (без enum, namespace и parameter properties в конструкторах).
- Код, комментарии и коммиты — на английском; интерфейс — RU (по умолчанию) и EN.

## Review Focus

1. **Глубокая ссылка `/#crm` при первом заходе** — камера сразу стоит на этаже CRM, а не пролетает башню сверху. Тест — задача 11.
2. **Поворот телефона или перекладка контента посреди страницы** — посетитель остаётся на том же этаже. Тест — задача 11.
3. **Потеря WebGL-контекста** (iOS при нехватке памяти) — страница переходит в режим Static, а не показывает пустой экран. Тест — задача 11.
4. **Назад/вперёд (bfcache)** — ровно один живой canvas, без двойной инициализации. Тест — задача 11.
5. **Заблокированное хранилище** (приватный режим Safari, строгие настройки) — `boot` не падает, переключатель режима работает через URL. Тест — задача 11.

---

## Структура файлов этого плана

| Файл | Ответственность |
|---|---|
| `package.json`, `astro.config.mjs`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `playwright.config.ts` | Инструменты и скрипты |
| `scene/tower.json` | Геометрия башни и камеры (контракт 3.1) |
| `src/engine/config.ts` | Типизированный доступ к `tower.json` |
| `src/engine/math.ts` | `clamp`, `damp`, `smoothstep` |
| `src/engine/lift.ts` | Скролл → позиция лифта |
| `src/engine/framing.ts` | Расстояние камеры и смещение кадра под экран |
| `src/engine/camera-path.ts` | Позиция лифта → поза камеры |
| `src/engine/tiers.ts` | Уровни качества, pixel ratio, политика движения |
| `src/engine/streaming.ts` | Какие этажи грузить и выгружать |
| `src/engine/loop.ts` | Цикл рендера по требованию с троттлингом в простое |
| `src/engine/events.ts` | Типизированная шина событий (контракт 3.4) |
| `src/engine/level-asset.ts` | Интерфейс этажа, освобождение памяти, фолбэк источника |
| `src/engine/greybox.ts` | Процедурные этажи-заглушки |
| `src/engine/level-manager.ts` | Стример этажей в сцене |
| `src/engine/camera-rig.ts` | Камера three.js, следующая за лифтом |
| `src/engine/fps-probe.ts` | Замер кадров для понижения уровня качества |
| `src/engine/signals.ts` | Чтение возможностей браузера (WebGL2, GPU, Save-Data) |
| `src/engine/scroll-binding.ts` | Измерение «перегонов» в DOM |
| `src/engine/boot.ts` | Стартовый бандл: уровень, режим, ленивый импорт движка |
| `src/engine/app.ts` | Склейка движка: рендерер, сцена, лифт, стример, цикл |
| `src/engine/debug-hud.ts` | HUD с FPS для прогона на устройствах (`?debug=1`) |
| `src/ui/elevator.ts`, `src/ui/elevator-panel.ts` | Панель лифта: чистая логика и DOM |
| `src/i18n/*` | Словари RU/EN |
| `src/styles/global.css` | Токены и раскладка |
| `src/layouts/Base.astro`, `src/components/*.astro`, `src/pages/*` | HTML-слой |
| `scripts/budgets.ts`, `scripts/check-budgets.ts` | Проверка бюджетов бандла |
| `.github/workflows/ci.yml`, `lighthouserc.json` | CI |
| `tests/e2e/*` | Playwright |
| `docs/qa/device-matrix.md` | Протокол прогона на устройствах |

---

### Task 1: Каркас проекта и инструменты

**Files:**
- Create: `.gitignore`, `.gitattributes`, `.editorconfig`, `package.json`, `astro.config.mjs`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `playwright.config.ts`
- Create: `src/layouts/Base.astro`, `src/pages/index.astro`
- Test: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: скрипты `pnpm dev | build | preview | preview:lan | check | lint | test | e2e | verify`; `Base.astro` с пропсами `{ lang: 'ru' | 'en'; title: string; description: string }`.

- [x] **Step 1: Инициализировать git и закоммитить документы**

```bash
git init
git add docs AGENTS.md
git commit -m "docs: brief, implementation plan and agent rules"
```

- [x] **Step 2: Служебные файлы**

`.gitignore`:
```gitignore
node_modules/
dist/
.astro/
art/out/
art/.venv/
__pycache__/
*.pyc
test-results/
playwright-report/
lhci/
.env
.env.*
!.env.example
.DS_Store
```

`.gitattributes`:
```gitattributes
* text=auto eol=lf
*.glb binary
*.webp binary
*.png binary
*.avif binary
*.jpg binary
*.blend binary
*.exr binary
*.ttf binary
*.woff2 binary
```

`.editorconfig`:
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.py]
indent_size = 4
```

- [x] **Step 3: `package.json`**

```json
{
  "name": "studio-tower",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.10.1",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "preview:lan": "astro build && astro preview --host",
    "check": "astro check && tsc --noEmit",
    "lint": "biome check .",
    "format": "biome format --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "verify": "pnpm lint && pnpm check && pnpm test && pnpm build && pnpm e2e"
  },
  "dependencies": {
    "astro": "7.3.8",
    "three": "0.186.1"
  },
  "devDependencies": {
    "@astrojs/check": "0.9.10",
    "@biomejs/biome": "2.5.15",
    "@playwright/test": "1.64.0",
    "@tailwindcss/vite": "4.3.3",
    "@types/node": "24.19.2",
    "@types/three": "0.186.0",
    "tailwindcss": "4.3.3",
    "tsx": "4.23.15",
    "typescript": "6.0.3",
    "vitest": "5.0.3",
    "zod": "4.6.5"
  }
}
```

- [x] **Step 4: Конфиги**

`astro.config.mjs`:
```js
// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  vite: { plugins: [tailwindcss()] },
});
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules", "art/out", "art/.venv"],
  "compilerOptions": {
    "noEmit": true,
    "noUncheckedIndexedAccess": true,
    "erasableSyntaxOnly": true,
    "allowImportingTsExtensions": true,
    "types": ["node"]
  }
}
```

`biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.15/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["**", "!**/dist", "!**/.astro", "!art/out", "!src/assets", "!**/*.astro"]
  },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single" } },
  "linter": { "rules": { "recommended": true } }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'art/scripts/**/*.test.ts'],
    environment: 'node',
  },
});
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
// SwiftShader gives headless Chromium a software WebGL2 implementation.
const webgl = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], launchOptions: webgl } },
    { name: 'android-chromium', use: { ...devices['Pixel 7'], launchOptions: webgl } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  ],
});
```

- [x] **Step 5: Установить зависимости и браузеры**

```bash
pnpm install
pnpm exec playwright install chromium webkit
```

Если pnpm сообщит «Ignored build scripts», выполнить `pnpm approve-builds` и разрешить перечисленные пакеты.

- [x] **Step 6: Написать падающий smoke-тест**

`tests/e2e/smoke.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('home page renders in Russian without console errors', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  // WebKit on CI has no reliable WebGL; static mode keeps this test about the page itself.
  await page.goto(browserName === 'webkit' ? '/?tier=static' : '/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page).toHaveTitle(/ИИ-агенты/);
  expect(errors).toEqual([]);
});
```

- [x] **Step 7: Запустить тест и убедиться, что он падает**

Run: `pnpm e2e tests/e2e/smoke.spec.ts --project=desktop-chromium`
Expected: FAIL — сборка не находит страниц (`src/pages` пуст) или у страницы нет заголовка.

- [x] **Step 8: Минимальная страница**

`src/layouts/Base.astro`:
```astro
---
interface Props {
  lang: 'ru' | 'en';
  title: string;
  description: string;
}
const { lang, title, description } = Astro.props;
---
<!doctype html>
<html lang={lang} data-tier="pending" data-motion="full">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#f3ebdd" />
    <title>{title}</title>
    <meta name="description" content={description} />
  </head>
  <body>
    <slot />
  </body>
</html>
```

`src/pages/index.astro`:
```astro
---
import Base from '../layouts/Base.astro';
---
<Base
  lang="ru"
  title="[Студия] — ИИ-агенты, CRM, автоматизация и сайты"
  description="Студия из трёх разработчиков: ИИ-агенты, CRM, автоматизация, сайты и бронирование."
>
  <main class="tower"><h1>[Студия]</h1></main>
</Base>
```

- [x] **Step 9: Прогнать проверки**

Run: `pnpm e2e tests/e2e/smoke.spec.ts`
Expected: PASS во всех трёх проектах.

Run: `pnpm lint && pnpm check && pnpm vitest run --passWithNoTests`
Expected: без ошибок.

- [x] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro site with Vitest, Playwright and Biome"
```

---

### Task 2: Конфиг башни (`tower.json`) и типизированный доступ

**Files:**
- Create: `scene/tower.json`, `src/engine/config.ts`
- Test: `src/engine/config.test.ts`

**Interfaces:**
- Produces: `LEVEL_IDS` (кортеж из 6 id), `type LevelId`, `type LevelKind`, `interface FrameRule`, `interface CameraConfig`, `interface TowerConfig`, `const tower: TowerConfig`, `levelIndex(id: LevelId, cfg?): number`, `levelBaseY(index: number, cfg?): number`.

- [x] **Step 1: Написать падающий тест**

`src/engine/config.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import raw from '../../scene/tower.json';
import { LEVEL_IDS, levelBaseY, levelIndex, tower } from './config';

const fraction = z.number().gt(0).lt(1);
const frameRule = z.object({
  fitWidth: z.number().gt(0).lte(1),
  centerX: fraction,
  centerY: fraction,
  minVisibleHeight: z.number().positive().optional(),
});
const schema = z.object({
  version: z.literal(1),
  level: z.object({
    width: z.number().positive(),
    depth: z.number().positive(),
    height: z.number().positive(),
    slab: z.number().positive(),
  }),
  levels: z
    .array(z.object({ id: z.enum(LEVEL_IDS), kind: z.enum(['roof', 'floor', 'basement']) }))
    .length(LEVEL_IDS.length),
  camera: z.object({
    fovDeg: z.number().min(10).max(90),
    pitchDeg: z.number().min(0).max(60),
    yawDeg: z.number().min(-60).max(60),
    targetHeight: z.number().positive(),
    travelBulge: z.number().min(0).max(0.5),
    portrait: frameRule,
    landscape: frameRule,
  }),
  tube: z.object({ x: z.number(), z: z.number(), radius: z.number().positive() }),
});

describe('scene/tower.json', () => {
  it('matches the schema', () => {
    expect(() => schema.parse(raw)).not.toThrow();
  });

  it('lists levels from the roof down in canonical order', () => {
    expect(tower.levels.map((level) => level.id)).toEqual([...LEVEL_IDS]);
  });

  it('starts with the roof and ends with the basement', () => {
    expect(tower.levels[0]?.kind).toBe('roof');
    expect(tower.levels.at(-1)?.kind).toBe('basement');
  });

  it('keeps the slab much thinner than a level', () => {
    expect(tower.level.slab).toBeLessThan(tower.level.height / 4);
  });
});

describe('level helpers', () => {
  it('finds level indices by id', () => {
    expect(levelIndex('roof')).toBe(0);
    expect(levelIndex('crm')).toBe(2);
    expect(levelIndex('basement')).toBe(5);
  });

  it('puts each level one level-height below the previous one', () => {
    expect(levelBaseY(0)).toBe(0);
    expect(levelBaseY(2)).toBe(-2 * tower.level.height);
  });
});
```

- [x] **Step 2: Запустить и убедиться, что падает**

Run: `pnpm vitest run src/engine/config.test.ts`
Expected: FAIL — `Cannot find module '../../scene/tower.json'`.

- [x] **Step 3: Реализация**

`scene/tower.json`:
```json
{
  "version": 1,
  "level": { "width": 12, "depth": 6, "height": 4, "slab": 0.4 },
  "levels": [
    { "id": "roof", "kind": "roof" },
    { "id": "agents", "kind": "floor" },
    { "id": "crm", "kind": "floor" },
    { "id": "booking", "kind": "floor" },
    { "id": "workshop", "kind": "floor" },
    { "id": "basement", "kind": "basement" }
  ],
  "camera": {
    "fovDeg": 30,
    "pitchDeg": 14,
    "yawDeg": 22,
    "targetHeight": 1.5,
    "travelBulge": 0.12,
    "portrait": { "fitWidth": 0.94, "centerX": 0.5, "centerY": 0.33 },
    "landscape": { "fitWidth": 0.55, "centerX": 0.34, "centerY": 0.5, "minVisibleHeight": 5.4 }
  },
  "tube": { "x": 5.3, "z": 1.6, "radius": 0.2 }
}
```

`src/engine/config.ts`:
```ts
import raw from '../../scene/tower.json';

export const LEVEL_IDS = ['roof', 'agents', 'crm', 'booking', 'workshop', 'basement'] as const;
export type LevelId = (typeof LEVEL_IDS)[number];
export type LevelKind = 'roof' | 'floor' | 'basement';

export interface FrameRule {
  /** Share of the screen width the level should occupy. */
  fitWidth: number;
  /** Where the level centre lands on screen, as a fraction of width/height. */
  centerX: number;
  centerY: number;
  /** Landscape only: world-space height that must stay visible. */
  minVisibleHeight?: number;
}

export interface CameraConfig {
  fovDeg: number;
  pitchDeg: number;
  yawDeg: number;
  targetHeight: number;
  travelBulge: number;
  portrait: FrameRule;
  landscape: FrameRule;
}

export interface TowerConfig {
  version: 1;
  level: { width: number; depth: number; height: number; slab: number };
  levels: ReadonlyArray<{ id: LevelId; kind: LevelKind }>;
  camera: CameraConfig;
  tube: { x: number; z: number; radius: number };
}

/** Shape is validated by config.test.ts; the cast is safe while that test passes. */
export const tower = raw as TowerConfig;

export function levelIndex(id: LevelId, cfg: TowerConfig = tower): number {
  const index = cfg.levels.findIndex((level) => level.id === id);
  if (index < 0) throw new Error(`Unknown level: ${id}`);
  return index;
}

/** Y of the floor surface of level `index` (0 = roof deck). */
export function levelBaseY(index: number, cfg: TowerConfig = tower): number {
  return 0 - index * cfg.level.height;
}
```

- [x] **Step 4: Запустить и убедиться, что проходит**

Run: `pnpm vitest run src/engine/config.test.ts`
Expected: PASS (6 тестов).

- [x] **Step 5: Commit**

```bash
git add scene/tower.json src/engine/config.ts src/engine/config.test.ts
git commit -m "feat(engine): add tower layout config with schema test"
```

---

### Task 3: Математика и лифт (скролл → позиция)

**Files:**
- Create: `src/engine/math.ts`, `src/engine/lift.ts`
- Test: `src/engine/math.test.ts`, `src/engine/lift.test.ts`

**Interfaces:**
- Produces: `clamp(v, min, max)`, `damp(current, target, lambda, dtSeconds)`, `smoothstep(t)`; `interface Travel { start: number; end: number }`, `normalizeTravels(travels): Travel[]`, `liftPosition(scrollY, travels): number` (диапазон `[0, travels.length]`).

- [x] **Step 1: Написать падающие тесты**

`src/engine/math.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { clamp, damp, smoothstep } from './math';

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('damp', () => {
  it('does not move without time', () => {
    expect(damp(0, 10, 6, 0)).toBe(0);
  });

  it('approaches the target over time', () => {
    expect(damp(0, 10, 6, 2)).toBeGreaterThan(9.99);
  });

  it('is frame-rate independent', () => {
    const twoHalfSteps = damp(damp(0, 10, 6, 0.008), 10, 6, 0.008);
    expect(twoHalfSteps).toBeCloseTo(damp(0, 10, 6, 0.016), 12);
  });
});

describe('smoothstep', () => {
  it('maps the ends and the middle exactly', () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
  });

  it('clamps outside [0, 1]', () => {
    expect(smoothstep(-2)).toBe(0);
    expect(smoothstep(3)).toBe(1);
  });
});
```

`src/engine/lift.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { liftPosition, normalizeTravels } from './lift';

const travels = [
  { start: 100, end: 200 },
  { start: 400, end: 500 },
  { start: 700, end: 800 },
];

describe('liftPosition', () => {
  it('holds at the roof before the first travel', () => {
    expect(liftPosition(0, travels)).toBe(0);
    expect(liftPosition(100, travels)).toBe(0);
  });

  it('is halfway in the middle of a travel', () => {
    expect(liftPosition(150, travels)).toBeCloseTo(0.5, 10);
  });

  it('eases in: a quarter of the scroll covers less than a quarter of the way', () => {
    expect(liftPosition(125, travels)).toBeLessThan(0.25);
  });

  it('holds at the next level between travels', () => {
    expect(liftPosition(300, travels)).toBe(1);
  });

  it('reaches the last level after the last travel', () => {
    expect(liftPosition(10_000, travels)).toBe(3);
  });

  it('treats NaN scroll as the top', () => {
    expect(liftPosition(Number.NaN, travels)).toBe(0);
  });

  it('steps instantly over a zero-length travel', () => {
    const instant = [{ start: 100, end: 100 }];
    expect(liftPosition(99, instant)).toBe(0);
    expect(liftPosition(100, instant)).toBe(1);
  });

  it('returns 0 when there are no travels', () => {
    expect(liftPosition(500, [])).toBe(0);
  });

  it('never moves backwards while scrolling down', () => {
    let previous = Number.NEGATIVE_INFINITY;
    for (let y = -50; y <= 900; y += 7) {
      const position = liftPosition(y, travels);
      expect(position).toBeGreaterThanOrEqual(previous);
      previous = position;
    }
  });
});

describe('normalizeTravels', () => {
  it('keeps sequential travels unchanged', () => {
    expect(normalizeTravels(travels)).toEqual(travels);
  });

  it('pushes an overlapping travel after the previous one', () => {
    expect(normalizeTravels([{ start: 0, end: 100 }, { start: 50, end: 150 }])).toEqual([
      { start: 0, end: 100 },
      { start: 100, end: 150 },
    ]);
  });

  it('turns a negative-length travel into a zero-length one', () => {
    expect(normalizeTravels([{ start: 100, end: 50 }])).toEqual([{ start: 100, end: 100 }]);
  });

  it('keeps the lift continuous after normalizing overlaps', () => {
    const fixed = normalizeTravels([{ start: 0, end: 100 }, { start: 50, end: 150 }]);
    for (let y = 0; y < 160; y += 1) {
      expect(Math.abs(liftPosition(y + 1, fixed) - liftPosition(y, fixed))).toBeLessThan(0.05);
    }
  });
});
```

- [x] **Step 2: Запустить и убедиться, что падают**

Run: `pnpm vitest run src/engine/math.test.ts src/engine/lift.test.ts`
Expected: FAIL — модулей `./math` и `./lift` нет.

- [x] **Step 3: Реализация**

`src/engine/math.ts`:
```ts
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Frame-rate independent exponential smoothing of `current` toward `target`. */
export function damp(current: number, target: number, lambda: number, dtSeconds: number): number {
  return target + (current - target) * Math.exp(-lambda * dtSeconds);
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}
```

`src/engine/lift.ts`:
```ts
import { smoothstep } from './math';

/** Scroll range (document px) during which the lift moves from level k to level k + 1. */
export interface Travel {
  start: number;
  end: number;
}

/** Makes travels sequential: none starts before the previous one ends, none has negative length. */
export function normalizeTravels(travels: readonly Travel[]): Travel[] {
  const result: Travel[] = [];
  let cursor = Number.NEGATIVE_INFINITY;
  for (const travel of travels) {
    const start = Math.max(travel.start, cursor);
    const end = Math.max(travel.end, start);
    result.push({ start, end });
    cursor = end;
  }
  return result;
}

/**
 * Lift position for a document scroll offset, in [0, travels.length].
 * Integer values mean "standing at a level"; fractions mean "between levels".
 * Expects normalized travels (see normalizeTravels).
 */
export function liftPosition(scrollY: number, travels: readonly Travel[]): number {
  if (!Number.isFinite(scrollY)) return 0;
  for (let k = 0; k < travels.length; k += 1) {
    const travel = travels[k];
    if (travel === undefined || scrollY >= travel.end) continue;
    if (scrollY <= travel.start) return k;
    return k + smoothstep((scrollY - travel.start) / (travel.end - travel.start));
  }
  return travels.length;
}
```

- [x] **Step 4: Запустить и убедиться, что проходят**

Run: `pnpm vitest run src/engine/math.test.ts src/engine/lift.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/engine/math.ts src/engine/math.test.ts src/engine/lift.ts src/engine/lift.test.ts
git commit -m "feat(engine): map document scroll to a continuous lift position"
```

---

### Task 4: Кадр и поза камеры

**Files:**
- Create: `src/engine/framing.ts`, `src/engine/camera-path.ts`, `scripts/gen-camera-fixtures.ts`, `scene/camera-fixtures.json` (генерируется)
- Test: `src/engine/framing.test.ts`, `src/engine/camera-path.test.ts`

**Interfaces:**
- Consumes: `CameraConfig`, `TowerConfig`, `tower` (задача 2); `clamp` (задача 3).
- Produces: `interface Viewport { width; height }`, `interface Framing { distance; viewOffsetX; viewOffsetY; orientation: 'portrait' | 'landscape' }`, `apparentWidth(width, depth, yawDeg)`, `computeFraming(viewport, camera, level)`; `type Vec3 = readonly [number, number, number]`, `interface Pose { position: Vec3; target: Vec3 }`, `cameraPose(liftPos, framing, cfg): Pose`. Фикстура `scene/camera-fixtures.json` — эталон для Python-копии этой математики (план 02).

- [x] **Step 1: Написать падающие тесты**

`src/engine/framing.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { CameraConfig } from './config';
import { tower } from './config';
import { apparentWidth, computeFraming } from './framing';

const camera: CameraConfig = {
  fovDeg: 30,
  pitchDeg: 14,
  yawDeg: 22,
  targetHeight: 1.5,
  travelBulge: 0.12,
  portrait: { fitWidth: 0.94, centerX: 0.5, centerY: 0.33 },
  landscape: { fitWidth: 0.55, centerX: 0.34, centerY: 0.5, minVisibleHeight: 5.4 },
};
const level = { width: 12, depth: 6 };
const tanHalf = Math.tan((30 * Math.PI) / 360);

describe('apparentWidth', () => {
  it('equals the width when looking straight on', () => {
    expect(apparentWidth(12, 6, 0)).toBeCloseTo(12, 10);
  });

  it('equals the depth when looking from the side', () => {
    expect(apparentWidth(12, 6, 90)).toBeCloseTo(6, 10);
  });
});

describe('computeFraming', () => {
  it('fits the level to the requested share of a portrait screen', () => {
    const viewport = { width: 390, height: 844 };
    const framing = computeFraming(viewport, camera, level);
    const visibleWidth = 2 * tanHalf * (390 / 844) * framing.distance;
    expect(framing.orientation).toBe('portrait');
    expect(apparentWidth(12, 6, 22) / visibleWidth).toBeCloseTo(0.94, 6);
  });

  it('keeps the minimum visible height in landscape', () => {
    const framing = computeFraming({ width: 1440, height: 900 }, camera, level);
    expect(framing.orientation).toBe('landscape');
    expect(2 * tanHalf * framing.distance).toBeGreaterThanOrEqual(5.4 - 1e-9);
  });

  it('never lets the level exceed its share of a landscape screen', () => {
    const framing = computeFraming({ width: 1440, height: 900 }, camera, level);
    const visibleWidth = 2 * tanHalf * (1440 / 900) * framing.distance;
    expect(apparentWidth(12, 6, 22) / visibleWidth).toBeLessThanOrEqual(0.55 + 1e-9);
  });

  it('shifts the frame so the level sits at the configured screen point', () => {
    const portrait = computeFraming({ width: 390, height: 844 }, camera, level);
    expect(portrait.viewOffsetX).toBeCloseTo(0, 10);
    expect(portrait.viewOffsetY).toBeCloseTo((0.5 - 0.33) * 844, 10);
    const landscape = computeFraming({ width: 1440, height: 900 }, camera, level);
    expect(landscape.viewOffsetX).toBeCloseTo((0.5 - 0.34) * 1440, 10);
  });

  it('returns finite numbers for an empty viewport', () => {
    const framing = computeFraming({ width: 0, height: 0 }, camera, level);
    expect(Number.isFinite(framing.distance)).toBe(true);
    expect(Number.isFinite(framing.viewOffsetX)).toBe(true);
  });

  it('works with the real tower config', () => {
    const framing = computeFraming({ width: 390, height: 844 }, tower.camera, tower.level);
    expect(framing.distance).toBeGreaterThan(0);
  });
});
```

`src/engine/camera-path.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import fixtures from '../../scene/camera-fixtures.json';
import { cameraPose } from './camera-path';
import { tower } from './config';
import { computeFraming } from './framing';

const framing = computeFraming({ width: 390, height: 844 }, tower.camera, tower.level);
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));

describe('cameraPose', () => {
  it('looks at the roof target at position 0', () => {
    expect(cameraPose(0, framing, tower).target).toEqual([0, tower.camera.targetHeight, 0]);
  });

  it('drops one level-height per level', () => {
    const pose = cameraPose(2, framing, tower);
    expect(pose.target[1]).toBeCloseTo(tower.camera.targetHeight - 2 * tower.level.height, 10);
  });

  it('stays exactly at the framing distance when standing at a level', () => {
    const pose = cameraPose(3, framing, tower);
    expect(distance(pose.position, pose.target)).toBeCloseTo(framing.distance, 9);
  });

  it('pulls back in the middle of a travel', () => {
    const pose = cameraPose(1.5, framing, tower);
    expect(distance(pose.position, pose.target)).toBeCloseTo(
      framing.distance * (1 + tower.camera.travelBulge),
      9,
    );
  });

  it('sits in front of and above the target', () => {
    const pose = cameraPose(1, framing, tower);
    expect(pose.position[2]).toBeGreaterThan(0);
    expect(pose.position[1]).toBeGreaterThan(pose.target[1]);
  });

  it('clamps out-of-range and NaN positions', () => {
    const last = tower.levels.length - 1;
    expect(cameraPose(-3, framing, tower)).toEqual(cameraPose(0, framing, tower));
    expect(cameraPose(99, framing, tower)).toEqual(cameraPose(last, framing, tower));
    expect(cameraPose(Number.NaN, framing, tower)).toEqual(cameraPose(0, framing, tower));
  });

  it('matches the shared fixtures used by the Python factory', () => {
    for (const fixture of fixtures.cases) {
      const caseFraming = computeFraming(fixture.viewport, tower.camera, tower.level);
      const pose = cameraPose(fixture.lift, caseFraming, tower);
      pose.position.forEach((value, i) => expect(value).toBeCloseTo(fixture.position[i] ?? 0, 6));
      pose.target.forEach((value, i) => expect(value).toBeCloseTo(fixture.target[i] ?? 0, 6));
    }
  });
});
```

- [x] **Step 2: Запустить и убедиться, что падают**

Run: `pnpm vitest run src/engine/framing.test.ts src/engine/camera-path.test.ts`
Expected: FAIL — нет модулей `./framing`, `./camera-path` и файла `camera-fixtures.json`.

- [x] **Step 3: Реализация**

`src/engine/framing.ts`:
```ts
import type { CameraConfig } from './config';

export interface Viewport {
  width: number;
  height: number;
}

export interface Framing {
  /** Camera distance from the level target. */
  distance: number;
  /** Pixel offsets for PerspectiveCamera.setViewOffset (positive X moves the scene left, positive Y up). */
  viewOffsetX: number;
  viewOffsetY: number;
  orientation: 'portrait' | 'landscape';
}

/** Width of the level box seen by a camera rotated yawDeg around the vertical axis. */
export function apparentWidth(width: number, depth: number, yawDeg: number): number {
  const yaw = (yawDeg * Math.PI) / 180;
  return width * Math.abs(Math.cos(yaw)) + depth * Math.abs(Math.sin(yaw));
}

export function computeFraming(
  viewport: Viewport,
  camera: CameraConfig,
  level: { width: number; depth: number },
): Framing {
  const width = viewport.width > 0 ? viewport.width : 1;
  const height = viewport.height > 0 ? viewport.height : 1;
  const aspect = width / height;
  const orientation = aspect < 1 ? 'portrait' : 'landscape';
  const rule = camera[orientation];
  const tanHalf = Math.tan((camera.fovDeg * Math.PI) / 360);
  const visibleWidthAtUnitDistance = 2 * tanHalf * aspect;
  const fitByWidth =
    apparentWidth(level.width, level.depth, camera.yawDeg) /
    (rule.fitWidth * visibleWidthAtUnitDistance);
  const fitByHeight =
    rule.minVisibleHeight === undefined ? 0 : rule.minVisibleHeight / (2 * tanHalf);
  return {
    distance: Math.max(fitByWidth, fitByHeight),
    viewOffsetX: (0.5 - rule.centerX) * width,
    viewOffsetY: (0.5 - rule.centerY) * height,
    orientation,
  };
}
```

`src/engine/camera-path.ts`:
```ts
import type { TowerConfig } from './config';
import type { Framing } from './framing';
import { clamp } from './math';

export type Vec3 = readonly [number, number, number];

export interface Pose {
  position: Vec3;
  target: Vec3;
}

/** Camera pose for a lift position: looks at the level centre, pulls back mid-travel. */
export function cameraPose(liftPos: number, framing: Framing, cfg: TowerConfig): Pose {
  const last = cfg.levels.length - 1;
  const p = clamp(Number.isFinite(liftPos) ? liftPos : 0, 0, last);
  const phase = p - Math.floor(p);
  const distance = framing.distance * (1 + cfg.camera.travelBulge * Math.sin(Math.PI * phase));
  const pitch = (cfg.camera.pitchDeg * Math.PI) / 180;
  const yaw = (cfg.camera.yawDeg * Math.PI) / 180;
  const targetY = cfg.camera.targetHeight - p * cfg.level.height;
  return {
    target: [0, targetY, 0],
    position: [
      Math.sin(yaw) * Math.cos(pitch) * distance,
      targetY + Math.sin(pitch) * distance,
      Math.cos(yaw) * Math.cos(pitch) * distance,
    ],
  };
}
```

`scripts/gen-camera-fixtures.ts`:
```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { cameraPose } from '../src/engine/camera-path.ts';
import type { TowerConfig } from '../src/engine/config.ts';
import { computeFraming } from '../src/engine/framing.ts';

const tower = JSON.parse(readFileSync('scene/tower.json', 'utf8')) as TowerConfig;
const viewports = [
  { width: 900, height: 1200 },
  { width: 1440, height: 900 },
];
const lifts = [0, 1, 2.5];

const cases = viewports.flatMap((viewport) =>
  lifts.map((lift) => {
    const pose = cameraPose(lift, computeFraming(viewport, tower.camera, tower.level), tower);
    return { viewport, lift, position: pose.position, target: pose.target };
  }),
);
writeFileSync('scene/camera-fixtures.json', `${JSON.stringify({ cases }, null, 2)}\n`);
console.log(`wrote ${cases.length} camera fixtures`);
```

> Скрипт запускается через `tsx`: он сам разрешает импорты без расширений внутри `src/engine`. Фикстуры перегенерируются только при осознанном изменении математики камеры, и тогда Python-копия в плане 02 обязана совпасть с новыми значениями.

`package.json` — добавить скрипт:
```json
"fixtures:camera": "tsx scripts/gen-camera-fixtures.ts"
```

- [x] **Step 4: Сгенерировать фикстуры и прогнать тесты**

Run: `pnpm fixtures:camera`
Expected: `wrote 6 camera fixtures`, появился `scene/camera-fixtures.json`.

Run: `pnpm vitest run src/engine/framing.test.ts src/engine/camera-path.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add package.json src/engine/framing.ts src/engine/framing.test.ts src/engine/camera-path.ts src/engine/camera-path.test.ts scripts/gen-camera-fixtures.ts scene/camera-fixtures.json
git commit -m "feat(engine): frame levels per screen and derive camera poses"
```

---

### Task 5: Уровни качества и политика движения

**Files:**
- Create: `src/engine/tiers.ts`
- Test: `src/engine/tiers.test.ts`

**Interfaces:**
- Produces: `type Tier = 'high' | 'lite' | 'static'`; `interface TierSignals { webgl2: boolean; saveData: boolean; deviceMemoryGb: number | null; gpu: string | null; override: Tier | null }`; `decideTier(s)`, `adjustTierByFps(tier, medianFrameMs)`, `pixelRatioFor(tier, devicePixelRatio)`, `parseTierOverride(search)`; `interface MotionPolicy { camera: 'smooth' | 'cut'; ambient: boolean }`, `motionPolicy(prefersReducedMotion)`.

- [x] **Step 1: Написать падающий тест**

`src/engine/tiers.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  adjustTierByFps,
  decideTier,
  motionPolicy,
  parseTierOverride,
  pixelRatioFor,
  type TierSignals,
} from './tiers';

const capable: TierSignals = {
  webgl2: true,
  saveData: false,
  deviceMemoryGb: 8,
  gpu: 'Apple GPU',
  override: null,
};

describe('decideTier', () => {
  it('gives a capable device the high tier', () => {
    expect(decideTier(capable)).toBe('high');
  });

  it('goes static without WebGL2, even if 3D is forced', () => {
    expect(decideTier({ ...capable, webgl2: false })).toBe('static');
    expect(decideTier({ ...capable, webgl2: false, override: 'high' })).toBe('static');
  });

  it('honours a forced tier when WebGL2 exists', () => {
    expect(decideTier({ ...capable, override: 'lite' })).toBe('lite');
    expect(decideTier({ ...capable, override: 'static' })).toBe('static');
    expect(decideTier({ ...capable, saveData: true, override: 'high' })).toBe('high');
  });

  it('respects Save-Data', () => {
    expect(decideTier({ ...capable, saveData: true })).toBe('static');
  });

  it('goes static on software renderers', () => {
    expect(decideTier({ ...capable, gpu: 'ANGLE (Google, SwiftShader Device)' })).toBe('static');
    expect(decideTier({ ...capable, gpu: 'llvmpipe (LLVM 15.0.7, 256 bits)' })).toBe('static');
  });

  it('goes static with 1 GB of memory and lite with 2 GB', () => {
    expect(decideTier({ ...capable, deviceMemoryGb: 1 })).toBe('static');
    expect(decideTier({ ...capable, deviceMemoryGb: 2 })).toBe('lite');
  });

  it('gives old mobile GPUs the lite tier', () => {
    expect(decideTier({ ...capable, gpu: 'Mali-T830' })).toBe('lite');
    expect(decideTier({ ...capable, gpu: 'Adreno (TM) 405' })).toBe('lite');
  });

  it('treats unknown memory and GPU as capable', () => {
    expect(decideTier({ ...capable, deviceMemoryGb: null, gpu: null })).toBe('high');
  });
});

describe('adjustTierByFps', () => {
  it('keeps high when frames are fast', () => {
    expect(adjustTierByFps('high', 16.7)).toBe('high');
  });

  it('drops high to lite below ~45 fps', () => {
    expect(adjustTierByFps('high', 30)).toBe('lite');
  });

  it('drops lite to static below ~25 fps', () => {
    expect(adjustTierByFps('lite', 35)).toBe('lite');
    expect(adjustTierByFps('lite', 50)).toBe('static');
  });

  it('ignores invalid measurements', () => {
    expect(adjustTierByFps('high', Number.NaN)).toBe('high');
  });
});

describe('pixelRatioFor', () => {
  it('caps high at 2', () => {
    expect(pixelRatioFor('high', 3)).toBe(2);
    expect(pixelRatioFor('high', 1.5)).toBe(1.5);
  });

  it('uses 1 for lite', () => {
    expect(pixelRatioFor('lite', 3)).toBe(1);
  });

  it('falls back to 1 for invalid ratios', () => {
    expect(pixelRatioFor('high', Number.NaN)).toBe(1);
    expect(pixelRatioFor('high', 0)).toBe(1);
  });
});

describe('parseTierOverride', () => {
  it('reads ?tier= from the query string', () => {
    expect(parseTierOverride('?tier=lite')).toBe('lite');
    expect(parseTierOverride('?debug=1&tier=static')).toBe('static');
  });

  it('ignores unknown values', () => {
    expect(parseTierOverride('?tier=ultra')).toBeNull();
    expect(parseTierOverride('')).toBeNull();
  });
});

describe('motionPolicy', () => {
  it('cuts the camera and stops ambient loops for reduced motion', () => {
    expect(motionPolicy(true)).toEqual({ camera: 'cut', ambient: false });
    expect(motionPolicy(false)).toEqual({ camera: 'smooth', ambient: true });
  });
});
```

- [x] **Step 2: Запустить и убедиться, что падает**

Run: `pnpm vitest run src/engine/tiers.test.ts`
Expected: FAIL — модуля `./tiers` нет.

- [x] **Step 3: Реализация**

`src/engine/tiers.ts`:
```ts
export type Tier = 'high' | 'lite' | 'static';

export interface TierSignals {
  webgl2: boolean;
  saveData: boolean;
  /** navigator.deviceMemory (Chromium only), null when unknown. */
  deviceMemoryGb: number | null;
  /** WebGL renderer string, null when unknown. */
  gpu: string | null;
  /** ?tier= or the visitor's stored choice. */
  override: Tier | null;
}

const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|basic render driver/i;
const OLD_MOBILE_GPU = /mali-4\d\d|mali-t\d+|adreno \(tm\) [2-4]\d\d|powervr sgx/i;

export function decideTier(signals: TierSignals): Tier {
  if (signals.override === 'static' || !signals.webgl2) return 'static';
  if (signals.override) return signals.override;
  if (signals.saveData) return 'static';
  if (signals.gpu && SOFTWARE_GPU.test(signals.gpu)) return 'static';
  if (signals.deviceMemoryGb !== null && signals.deviceMemoryGb <= 1) return 'static';
  if (signals.gpu && OLD_MOBILE_GPU.test(signals.gpu)) return 'lite';
  if (signals.deviceMemoryGb !== null && signals.deviceMemoryGb <= 2) return 'lite';
  return 'high';
}

/** Downgrades the tier when the measured median frame time is too slow. */
export function adjustTierByFps(tier: Tier, medianFrameMs: number): Tier {
  if (!Number.isFinite(medianFrameMs)) return tier;
  if (tier === 'high' && medianFrameMs > 22) return 'lite';
  if (tier === 'lite' && medianFrameMs > 40) return 'static';
  return tier;
}

export function pixelRatioFor(tier: Tier, devicePixelRatio: number): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return tier === 'high' ? Math.min(dpr, 2) : 1;
}

export function parseTierOverride(search: string): Tier | null {
  const value = new URLSearchParams(search).get('tier');
  return value === 'high' || value === 'lite' || value === 'static' ? value : null;
}

export interface MotionPolicy {
  camera: 'smooth' | 'cut';
  ambient: boolean;
}

export function motionPolicy(prefersReducedMotion: boolean): MotionPolicy {
  return prefersReducedMotion
    ? { camera: 'cut', ambient: false }
    : { camera: 'smooth', ambient: true };
}
```

- [x] **Step 4: Запустить и убедиться, что проходит**

Run: `pnpm vitest run src/engine/tiers.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/engine/tiers.ts src/engine/tiers.test.ts
git commit -m "feat(engine): decide quality tier from device signals and frame times"
```

---

### Task 6: План стриминга этажей

**Files:**
- Create: `src/engine/streaming.ts`
- Test: `src/engine/streaming.test.ts`

**Interfaces:**
- Produces: `type LevelStatus = 'absent' | 'loading' | 'ready'`; `interface StreamingPlan { load: number[]; dispose: number[] }`; `keepWindow(position, total, radius): { from; to }`; `planStreaming(statuses, position, radius = 1): StreamingPlan` (грузит окно ±radius, выгружает за ±(radius + 1), ближайшие этажи первыми).

- [x] **Step 1: Написать падающий тест**

`src/engine/streaming.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { keepWindow, type LevelStatus, planStreaming } from './streaming';

const all = (status: LevelStatus, count = 6): LevelStatus[] => Array(count).fill(status);

describe('keepWindow', () => {
  it('covers both neighbours while travelling between levels', () => {
    expect(keepWindow(2.5, 6, 1)).toEqual({ from: 1, to: 4 });
  });

  it('clamps at the ends', () => {
    expect(keepWindow(0, 6, 1)).toEqual({ from: 0, to: 1 });
    expect(keepWindow(5, 6, 1)).toEqual({ from: 4, to: 5 });
  });

  it('treats NaN as the top', () => {
    expect(keepWindow(Number.NaN, 6, 1)).toEqual({ from: 0, to: 1 });
  });
});

describe('planStreaming', () => {
  it('loads the roof and the first floor at the start', () => {
    expect(planStreaming(all('absent'), 0)).toEqual({ load: [0, 1], dispose: [] });
  });

  it('loads the nearest levels first', () => {
    expect(planStreaming(all('absent'), 2.5).load).toEqual([2, 3, 1, 4]);
  });

  it('disposes ready levels beyond the hysteresis window', () => {
    expect(planStreaming(all('ready'), 4)).toEqual({ load: [], dispose: [0, 1] });
  });

  it('keeps a ready level two floors away (hysteresis)', () => {
    const statuses: LevelStatus[] = ['absent', 'ready', 'ready', 'ready', 'ready', 'absent'];
    expect(planStreaming(statuses, 3).dispose).toEqual([]);
  });

  it('never disposes a level that is still loading', () => {
    const statuses: LevelStatus[] = ['loading', 'absent', 'absent', 'absent', 'absent', 'absent'];
    expect(planStreaming(statuses, 5).dispose).toEqual([]);
  });

  it('respects a custom radius', () => {
    expect(planStreaming(all('absent'), 0, 2).load).toEqual([0, 1, 2]);
  });
});
```

- [x] **Step 2: Запустить и убедиться, что падает**

Run: `pnpm vitest run src/engine/streaming.test.ts`
Expected: FAIL — модуля `./streaming` нет.

- [x] **Step 3: Реализация**

`src/engine/streaming.ts`:
```ts
import { clamp } from './math';

export type LevelStatus = 'absent' | 'loading' | 'ready';

export interface StreamingPlan {
  load: number[];
  dispose: number[];
}

export function keepWindow(position: number, total: number, radius: number): { from: number; to: number } {
  const p = clamp(Number.isFinite(position) ? position : 0, 0, Math.max(0, total - 1));
  return {
    from: Math.max(0, Math.floor(p) - radius),
    to: Math.min(total - 1, Math.ceil(p) + radius),
  };
}

/** Levels within ±radius are loaded; ready levels beyond ±(radius + 1) are disposed. */
export function planStreaming(
  statuses: readonly LevelStatus[],
  position: number,
  radius = 1,
): StreamingPlan {
  const total = statuses.length;
  const keep = keepWindow(position, total, radius);
  const evict = keepWindow(position, total, radius + 1);
  const load: number[] = [];
  const dispose: number[] = [];
  statuses.forEach((status, index) => {
    if (status === 'absent' && index >= keep.from && index <= keep.to) load.push(index);
    if (status === 'ready' && (index < evict.from || index > evict.to)) dispose.push(index);
  });
  const centre = clamp(Number.isFinite(position) ? position : 0, 0, Math.max(0, total - 1));
  load.sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
  return { load, dispose };
}
```

- [x] **Step 4: Запустить и убедиться, что проходит**

Run: `pnpm vitest run src/engine/streaming.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/engine/streaming.ts src/engine/streaming.test.ts
git commit -m "feat(engine): plan level streaming with a hysteresis window"
```

---

### Task 7: Цикл рендера по требованию

**Files:**
- Create: `src/engine/loop.ts`
- Test: `src/engine/loop.test.ts`

**Interfaces:**
- Produces: `interface FrameScheduler { request(cb: (timeMs: number) => void): number; cancel(id: number): void }`, `browserScheduler`, `interface LoopOptions { idleAfterMs; idleFps }`, `type RenderFn = (dtSeconds: number, timeMs: number) => void`, `class RenderLoop { start(); stop(); invalidate(frames?, nowMs?); markActivity(nowMs?); setContinuous(reason, on); readonly scheduled: boolean }`.

- [x] **Step 1: Написать падающий тест**

`src/engine/loop.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { type FrameScheduler, RenderLoop } from './loop';

class FakeScheduler implements FrameScheduler {
  private callbacks = new Map<number, (timeMs: number) => void>();
  private nextId = 1;

  request(callback: (timeMs: number) => void): number {
    const id = this.nextId++;
    this.callbacks.set(id, callback);
    return id;
  }

  cancel(id: number): void {
    this.callbacks.delete(id);
  }

  get pending(): number {
    return this.callbacks.size;
  }

  frame(timeMs: number): void {
    const due = [...this.callbacks.values()];
    this.callbacks.clear();
    for (const callback of due) callback(timeMs);
  }
}

function setup() {
  const scheduler = new FakeScheduler();
  const renders: Array<{ dt: number; time: number }> = [];
  const loop = new RenderLoop((dt, time) => renders.push({ dt, time }), scheduler, {
    idleAfterMs: 8000,
    idleFps: 30,
  });
  return { scheduler, renders, loop };
}

describe('RenderLoop', () => {
  it('schedules nothing without work', () => {
    const { scheduler, loop } = setup();
    loop.start();
    expect(scheduler.pending).toBe(0);
  });

  it('renders once per invalidate and then goes quiet', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.invalidate(1, 0);
    scheduler.frame(16);
    expect(renders).toHaveLength(1);
    expect(scheduler.pending).toBe(0);
  });

  it('renders the requested number of frames', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.invalidate(3, 0);
    scheduler.frame(16);
    scheduler.frame(32);
    scheduler.frame(48);
    expect(renders).toHaveLength(3);
    expect(scheduler.pending).toBe(0);
  });

  it('renders every frame while continuous and stops when released', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.markActivity(0);
    loop.setContinuous('camera', true);
    for (let t = 16; t <= 160; t += 16) scheduler.frame(t);
    expect(renders).toHaveLength(10);
    loop.setContinuous('camera', false);
    scheduler.frame(176);
    expect(scheduler.pending).toBe(0);
  });

  it('throttles to the idle frame rate after inactivity', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.markActivity(0);
    loop.setContinuous('ambient', true);
    for (let t = 1000 / 60; t <= 10_000; t += 1000 / 60) scheduler.frame(t);
    const lastTwoSeconds = renders.filter((r) => r.time > 8000).length;
    expect(lastTwoSeconds).toBeGreaterThanOrEqual(55);
    expect(lastTwoSeconds).toBeLessThanOrEqual(65);
  });

  it('renders at full rate again right after activity', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.markActivity(0);
    loop.setContinuous('ambient', true);
    scheduler.frame(9000);
    loop.invalidate(1, 9001);
    const before = renders.length;
    scheduler.frame(9016);
    scheduler.frame(9032);
    expect(renders.length - before).toBe(2);
  });

  it('stop cancels the pending frame and start resumes pending work', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.invalidate(1, 0);
    loop.stop();
    expect(scheduler.pending).toBe(0);
    loop.start();
    scheduler.frame(16);
    expect(renders).toHaveLength(1);
  });

  it('starts with dt = 0 and clamps long gaps to 0.1 s', () => {
    const { scheduler, renders, loop } = setup();
    loop.start();
    loop.markActivity(0);
    loop.setContinuous('camera', true);
    scheduler.frame(100);
    scheduler.frame(2000);
    expect(renders[0]?.dt).toBe(0);
    expect(renders[1]?.dt).toBe(0.1);
  });
});
```

- [x] **Step 2: Запустить и убедиться, что падает**

Run: `pnpm vitest run src/engine/loop.test.ts`
Expected: FAIL — модуля `./loop` нет.

- [x] **Step 3: Реализация**

`src/engine/loop.ts`:
```ts
export interface FrameScheduler {
  request(callback: (timeMs: number) => void): number;
  cancel(id: number): void;
}

export const browserScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

export interface LoopOptions {
  /** After this long without activity, continuous rendering drops to idleFps. */
  idleAfterMs: number;
  idleFps: number;
}

export type RenderFn = (dtSeconds: number, timeMs: number) => void;

const DEFAULT_OPTIONS: LoopOptions = { idleAfterMs: 8000, idleFps: 30 };

/** Renders only when something changed or an animation needs frames. */
export class RenderLoop {
  private readonly render: RenderFn;
  private readonly scheduler: FrameScheduler;
  private readonly options: LoopOptions;
  private readonly continuousReasons = new Set<string>();
  private frameId: number | null = null;
  private pendingFrames = 0;
  private running = false;
  private lastFrameTime: number | null = null;
  private lastRenderTime = Number.NEGATIVE_INFINITY;
  private lastActivityTime = 0;

  constructor(
    render: RenderFn,
    scheduler: FrameScheduler = browserScheduler,
    options: LoopOptions = DEFAULT_OPTIONS,
  ) {
    this.render = render;
    this.scheduler = scheduler;
    this.options = options;
  }

  get scheduled(): boolean {
    return this.frameId !== null;
  }

  start(): void {
    this.running = true;
    this.schedule();
  }

  stop(): void {
    this.running = false;
    if (this.frameId !== null) this.scheduler.cancel(this.frameId);
    this.frameId = null;
    this.lastFrameTime = null;
  }

  /** Requests at least `frames` renders; counts as visitor activity. */
  invalidate(frames = 1, nowMs?: number): void {
    this.pendingFrames = Math.max(this.pendingFrames, frames);
    this.markActivity(nowMs);
    this.schedule();
  }

  markActivity(nowMs?: number): void {
    this.lastActivityTime = nowMs ?? performance.now();
  }

  setContinuous(reason: string, on: boolean): void {
    if (on) this.continuousReasons.add(reason);
    else this.continuousReasons.delete(reason);
    this.schedule();
  }

  private hasWork(): boolean {
    return this.pendingFrames > 0 || this.continuousReasons.size > 0;
  }

  private schedule(): void {
    if (!this.running || this.frameId !== null) return;
    if (!this.hasWork()) {
      this.lastFrameTime = null;
      return;
    }
    this.frameId = this.scheduler.request(this.tick);
  }

  private readonly tick = (timeMs: number): void => {
    this.frameId = null;
    const idle =
      this.pendingFrames === 0 && timeMs - this.lastActivityTime > this.options.idleAfterMs;
    const minInterval = idle ? 1000 / this.options.idleFps : 0;
    if (timeMs - this.lastRenderTime >= minInterval - 1) {
      const dt =
        this.lastFrameTime === null ? 0 : Math.min((timeMs - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = timeMs;
      this.lastRenderTime = timeMs;
      if (this.pendingFrames > 0) this.pendingFrames -= 1;
      this.render(dt, timeMs);
    }
    this.schedule();
  };
}
```

- [x] **Step 4: Запустить и убедиться, что проходит**

Run: `pnpm vitest run src/engine/loop.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/engine/loop.ts src/engine/loop.test.ts
git commit -m "feat(engine): add on-demand render loop with idle throttling"
```

---

### Task 8: HTML-слой: страница башни, словари, стили

**Files:**
- Create: `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`, `src/styles/global.css`
- Create: `src/components/TowerPage.astro`, `Stage.astro`, `TopBar.astro`, `Hero.astro`, `LevelSection.astro`, `ElevatorPanel.astro`, `CtaButton.astro`
- Create: `src/pages/en/index.astro`
- Modify: `src/layouts/Base.astro` (подключить стили), `src/pages/index.astro` (словарь + `TowerPage`)
- Test: `src/i18n/i18n.test.ts`, `tests/e2e/layout.spec.ts`

**Interfaces:**
- Consumes: `LEVEL_IDS`, `LevelId` (задача 2).
- Produces: `type Locale = 'ru' | 'en'`, `type Dict`, `dict(locale): Dict`. DOM-контракт 3.5: `section.level[data-level][data-index]`, `.level__content#<id>`, `[data-lift-travel]`, `[data-elevator-link]`, `[data-mode-toggle][data-label-static][data-label-live]`, `#stage[data-state="poster"]`.

- [x] **Step 1: Написать падающие тесты**

`src/i18n/i18n.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { LEVEL_IDS } from '../engine/config';
import { en } from './en';
import { ru } from './ru';

function leaves(value: unknown, prefix = ''): Array<[string, unknown]> {
  if (typeof value !== 'object' || value === null) return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('dictionaries', () => {
  it('have identical keys in ru and en', () => {
    const keys = (d: unknown) => leaves(d).map(([key]) => key).sort();
    expect(keys(en)).toEqual(keys(ru));
  });

  it('contain only non-empty strings', () => {
    for (const d of [ru, en]) {
      for (const [key, value] of leaves(d)) {
        expect(typeof value, key).toBe('string');
        expect((value as string).trim(), key).not.toBe('');
      }
    }
  });

  it('describe every level of the tower', () => {
    for (const id of LEVEL_IDS) {
      expect(ru.levels[id].title).toBeTruthy();
      expect(en.levels[id].title).toBeTruthy();
    }
  });
});
```

`tests/e2e/layout.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

const LEVELS = ['roof', 'agents', 'crm', 'booking', 'workshop', 'basement'];

test('renders one section and one anchor per level', async ({ page }) => {
  await page.goto('/?tier=static');
  for (const id of LEVELS) {
    await expect(page.locator(`section[data-level="${id}"]`)).toHaveCount(1);
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test('elevator panel links to every level', async ({ page }) => {
  await page.goto('/?tier=static');
  const links = page.locator('[data-elevator-link]');
  await expect(links).toHaveCount(6);
  await links.nth(2).click();
  await expect(page).toHaveURL(/#crm$/);
  await expect(page.locator('#crm')).toBeInViewport();
});

test('the discuss-project button stays visible on every level', async ({ page }) => {
  await page.goto('/?tier=static');
  const cta = page.locator('.cta');
  for (const id of LEVELS) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(cta).toBeVisible();
  }
});

test('has no horizontal scroll on a 360 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/?tier=static');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the English page is in English', async ({ page }) => {
  await page.goto('/en/?tier=static');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#agents-title')).toContainText('AI');
});
```

- [x] **Step 2: Запустить и убедиться, что падают**

Run: `pnpm vitest run src/i18n/i18n.test.ts`
Expected: FAIL — модулей `./ru`, `./en` нет.

Run: `pnpm e2e tests/e2e/layout.spec.ts --project=desktop-chromium`
Expected: FAIL — секций этажей на странице нет.

- [x] **Step 3: Словари**

`src/i18n/ru.ts`:
```ts
export const ru = {
  brand: '[Студия]',
  meta: {
    title: '[Студия] — ИИ-агенты, CRM, автоматизация и сайты',
    description:
      'Студия из трёх разработчиков: ИИ-агенты для WhatsApp, Telegram и Instagram, CRM и автоматизация процессов, сайты, веб-приложения и модули бронирования.',
  },
  hero: {
    kicker: 'Крыша · Входящие',
    title: 'Нас трое. Агентов — сколько потребуется.',
    lead: 'Ваш бизнес получает сотни сообщений в день. Мы строим системы, которые отвечают, записывают и продают — пока вы занимаетесь делом.',
    primary: 'Спуститься в башню',
    secondary: 'Обсудить проект',
  },
  levels: {
    roof: {
      short: 'К',
      name: 'Крыша',
      title: 'Входящие',
      lead: 'Сообщения из WhatsApp, Telegram, Instagram и с сайта сыплются круглосуточно.',
    },
    agents: {
      short: '4',
      name: 'Этаж 4',
      title: 'Диспетчерская ИИ-агентов',
      lead: 'Агенты отвечают клиентам в WhatsApp, Telegram и Instagram, квалифицируют заявки и записывают на услуги — круглосуточно.',
    },
    crm: {
      short: '3',
      name: 'Этаж 3',
      title: 'Сортировочный цех: CRM и процессы',
      lead: 'Заявки сами попадают в CRM и распределяются менеджерам, а счета, оплаты и напоминания уходят без ручной рутины.',
    },
    booking: {
      short: '2',
      name: 'Этаж 2',
      title: 'Календарный зал: бронирование',
      lead: 'Онлайн-запись и бронирование для отелей, туров, клиник и салонов — с оплатой, напоминаниями и синхронизацией календарей.',
    },
    workshop: {
      short: '1',
      name: 'Этаж 1',
      title: 'Мастерская: сайты и веб-приложения',
      lead: 'Быстрые сайты и веб-приложения, которые продают и легко развиваются.',
    },
    basement: {
      short: 'П',
      name: 'Подвал',
      title: 'Пульт: команда и связь',
      lead: 'Всей башней управляют три человека. Расскажите о задаче — ответим в течение рабочего дня.',
    },
  },
  panel: { label: 'Этажи башни' },
  cta: { discuss: 'Обсудить проект' },
  mode: { toStatic: 'Режим без 3D', toLive: 'Включить 3D' },
  lang: { switchTo: 'EN', href: '/en/', hreflang: 'en' },
} as const;
```

`src/i18n/index.ts`:
```ts
import { en } from './en';
import { ru } from './ru';

export type Locale = 'ru' | 'en';

type Widen<T> = T extends string ? string : { readonly [K in keyof T]: Widen<T[K]> };
export type Dict = Widen<typeof ru>;

const dictionaries: Record<Locale, Dict> = { ru, en };

export function dict(locale: Locale): Dict {
  return dictionaries[locale];
}
```

`src/i18n/en.ts`:
```ts
import type { Dict } from './index';

export const en = {
  brand: '[Studio]',
  meta: {
    title: '[Studio] — AI agents, CRM, automation and websites',
    description:
      'A studio of three developers: AI agents for WhatsApp, Telegram and Instagram, CRM and process automation, websites, web apps and booking engines.',
  },
  hero: {
    kicker: 'Roof · Inbox',
    title: 'There are three of us. As many agents as you need.',
    lead: 'Your business gets hundreds of messages a day. We build systems that reply, book and sell — while you run the business.',
    primary: 'Ride down the tower',
    secondary: 'Discuss a project',
  },
  levels: {
    roof: {
      short: 'R',
      name: 'Roof',
      title: 'Inbox',
      lead: 'Messages from WhatsApp, Telegram, Instagram and your website pour in around the clock.',
    },
    agents: {
      short: '4',
      name: 'Floor 4',
      title: 'AI agent dispatch room',
      lead: 'Agents answer customers in WhatsApp, Telegram and Instagram, qualify leads and book appointments — 24/7.',
    },
    crm: {
      short: '3',
      name: 'Floor 3',
      title: 'Sorting hall: CRM and processes',
      lead: 'Leads land in your CRM and reach the right manager on their own, while invoices, payments and reminders go out without manual routine.',
    },
    booking: {
      short: '2',
      name: 'Floor 2',
      title: 'Calendar hall: booking',
      lead: 'Online booking for hotels, tours, clinics and salons — with payments, reminders and calendar sync.',
    },
    workshop: {
      short: '1',
      name: 'Floor 1',
      title: 'Workshop: websites and web apps',
      lead: 'Fast websites and web apps that sell and are easy to grow.',
    },
    basement: {
      short: 'B',
      name: 'Basement',
      title: 'Control room: the team and contact',
      lead: 'Three people run the whole tower. Tell us about your task — we reply within one business day.',
    },
  },
  panel: { label: 'Tower floors' },
  cta: { discuss: 'Discuss a project' },
  mode: { toStatic: 'No-3D mode', toLive: 'Turn on 3D' },
  lang: { switchTo: 'RU', href: '/', hreflang: 'ru' },
} satisfies Dict;
```

- [x] **Step 4: Стили**

`src/styles/global.css`:
```css
@import "tailwindcss";

@theme {
  --color-sand: #f3ebdd;
  --color-sand-dark: #e4d6bf;
  --color-ink: #1c1b22;
  --color-signal: #ff5a1f;
  --color-teal: #1fa59a;
  --color-mustard: #f2b33d;
  --color-brass: #c9a15b;
}

:root {
  color-scheme: light;
  --panel-w: 3.5rem;
}

html {
  background: var(--color-sand);
  color: var(--color-ink);
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

html[data-motion="reduced"] {
  scroll-behavior: auto;
}

body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  line-height: 1.5;
}

/* Fixed 3D layer. 100lvh keeps it from resizing when mobile browser bars show or hide. */
.stage {
  position: fixed;
  inset: 0 0 auto 0;
  height: 100vh;
  height: 100lvh;
  z-index: 0;
  background: radial-gradient(120% 80% at 50% 18%, #fbf6ec 0%, var(--color-sand) 55%, var(--color-sand-dark) 100%);
}

.stage canvas {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 600ms ease;
}

.stage[data-state="live"] canvas {
  opacity: 1;
}

.topbar {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
}

.topbar__brand {
  font-weight: 800;
  letter-spacing: 0.02em;
}

.topbar__actions {
  display: flex;
  gap: 0.5rem;
}

.chip {
  font: inherit;
  font-size: 0.8125rem;
  min-height: 2.25rem;
  padding: 0 0.875rem;
  border-radius: 999px;
  border: 1px solid rgb(28 27 34 / 0.2);
  background: rgb(243 235 221 / 0.92);
  color: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.tower {
  position: relative;
  z-index: 1;
  padding-bottom: 7rem;
}

/* padding-bottom keeps the lift standing while the text scrolls away, so deep links never land mid-travel. */
.level {
  position: relative;
  padding-bottom: 40svh;
}

.level__travel {
  height: 90svh;
}

.level__content {
  position: relative;
  margin: 46svh calc(var(--panel-w) + 1rem) 0 1rem;
  padding: 1.25rem 1.25rem 1.5rem;
  border-radius: 1.25rem;
  background: rgb(243 235 221 / 0.94);
  box-shadow: 0 12px 32px -20px rgb(28 27 34 / 0.45);
  scroll-margin-top: 44svh;
}

.level__kicker {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(28 27 34 / 0.6);
}

.level__title {
  margin: 0 0 0.5rem;
  font-size: clamp(1.375rem, 4.5vw, 2rem);
  line-height: 1.15;
}

.level__lead {
  margin: 0;
}

.hero {
  min-height: 100svh;
  display: flex;
  align-items: flex-end;
}

.hero .level__content {
  margin-top: 0;
  margin-bottom: 6rem;
  scroll-margin-top: 100svh;
}

.hero__title {
  margin: 0 0 0.75rem;
  font-size: clamp(1.75rem, 7vw, 3.25rem);
  line-height: 1.05;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.button {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0 1.125rem;
  border-radius: 999px;
  border: 2px solid var(--color-ink);
  color: var(--color-ink);
  font-weight: 700;
  text-decoration: none;
}

.button--primary {
  background: var(--color-ink);
  color: var(--color-sand);
}

.elevator {
  position: fixed;
  z-index: 2;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem;
  border-radius: 999px;
  background: rgb(28 27 34 / 0.82);
}

.elevator__dial {
  display: none;
}

.elevator__needle {
  transform-box: view-box;
  transform-origin: 50px 56px;
  transform: rotate(var(--needle, -90deg));
  transition: transform 120ms linear;
}

.elevator__floors {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.elevator__button {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  color: var(--color-sand);
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
}

.elevator__button[aria-current] {
  background: var(--color-brass);
  color: var(--color-ink);
}

.cta {
  position: fixed;
  z-index: 2;
  left: 1rem;
  right: calc(var(--panel-w) + 1rem);
  bottom: max(1rem, env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 3rem;
  border-radius: 999px;
  background: var(--color-signal);
  color: #fff;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 10px 24px -12px rgb(255 90 31 / 0.8);
}

@media (min-width: 1024px) and (orientation: landscape) {
  :root {
    --panel-w: 4.5rem;
  }

  .level__content {
    margin: 32svh 6vw 0 58vw;
    max-width: 34rem;
    scroll-margin-top: 20svh;
  }

  .hero .level__content {
    margin-bottom: 8rem;
  }

  .elevator {
    right: 1.25rem;
    padding: 0.75rem 0.5rem;
    border-radius: 1.25rem;
    background: linear-gradient(180deg, #d9b878, var(--color-brass));
  }

  .elevator__dial {
    display: block;
    width: 3.5rem;
  }

  .elevator__button {
    color: var(--color-ink);
    background: rgb(255 255 255 / 0.35);
  }

  .elevator__button[aria-current] {
    background: var(--color-ink);
    color: var(--color-sand);
  }

  .cta {
    left: auto;
    right: 7rem;
    bottom: 1.5rem;
    padding: 0 1.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  .stage canvas {
    transition: none;
  }
}
```

- [x] **Step 5: Компоненты и страницы**

`src/layouts/Base.astro` — добавить импорт стилей первой строкой фронтматтера:
```astro
---
import '../styles/global.css';

interface Props {
  lang: 'ru' | 'en';
  title: string;
  description: string;
}
const { lang, title, description } = Astro.props;
---
```
(остальная разметка без изменений).

`src/components/Stage.astro`:
```astro
<div class="stage" id="stage" data-state="poster" aria-hidden="true"></div>
```

`src/components/TopBar.astro`:
```astro
---
import { dict, type Locale } from '../i18n';

interface Props {
  locale: Locale;
}
const t = dict(Astro.props.locale);
---
<header class="topbar">
  <span class="topbar__brand">{t.brand}</span>
  <div class="topbar__actions">
    <button
      type="button"
      class="chip"
      data-mode-toggle
      data-label-static={t.mode.toStatic}
      data-label-live={t.mode.toLive}
    >
      {t.mode.toStatic}
    </button>
    <a class="chip" href={t.lang.href} hreflang={t.lang.hreflang} lang={t.lang.hreflang}>
      {t.lang.switchTo}
    </a>
  </div>
</header>
```

`src/components/Hero.astro`:
```astro
---
import { dict, type Locale } from '../i18n';

interface Props {
  locale: Locale;
}
const t = dict(Astro.props.locale);
---
<section class="level hero" data-level="roof" data-index="0" aria-labelledby="roof-title">
  <div class="level__content" id="roof">
    <p class="level__kicker">{t.hero.kicker}</p>
    <h1 id="roof-title" class="hero__title">{t.hero.title}</h1>
    <p class="level__lead">{t.hero.lead}</p>
    <div class="hero__actions">
      <a class="button button--primary" href="#agents">{t.hero.primary}</a>
      <a class="button" href="#basement">{t.hero.secondary}</a>
    </div>
  </div>
</section>
```

`src/components/LevelSection.astro`:
```astro
---
import type { LevelId } from '../engine/config';
import { dict, type Locale } from '../i18n';

interface Props {
  id: LevelId;
  index: number;
  locale: Locale;
}
const { id, index, locale } = Astro.props;
const copy = dict(locale).levels[id];
---
<section class="level" data-level={id} data-index={index} aria-labelledby={`${id}-title`}>
  <div class="level__travel" data-lift-travel aria-hidden="true"></div>
  <div class="level__content" id={id}>
    <p class="level__kicker">{copy.name}</p>
    <h2 id={`${id}-title`} class="level__title">{copy.title}</h2>
    <p class="level__lead">{copy.lead}</p>
    <slot />
  </div>
</section>
```

`src/components/ElevatorPanel.astro`:
```astro
---
import { LEVEL_IDS } from '../engine/config';
import { dict, type Locale } from '../i18n';

interface Props {
  locale: Locale;
}
const t = dict(Astro.props.locale);
---
<nav class="elevator" aria-label={t.panel.label} data-elevator>
  <svg class="elevator__dial" viewBox="0 0 100 64" aria-hidden="true">
    <path d="M10 56 A40 40 0 0 1 90 56" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity="0.5"></path>
    <line class="elevator__needle" x1="50" y1="56" x2="50" y2="20" stroke="#1c1b22" stroke-width="4" stroke-linecap="round"></line>
    <circle cx="50" cy="56" r="6" fill="#1c1b22"></circle>
  </svg>
  <ol class="elevator__floors">
    {LEVEL_IDS.map((id, index) => (
      <li>
        <a
          class="elevator__button"
          href={`#${id}`}
          data-elevator-link={index}
          aria-label={`${t.levels[id].name}: ${t.levels[id].title}`}
        >
          {t.levels[id].short}
        </a>
      </li>
    ))}
  </ol>
</nav>
```

`src/components/CtaButton.astro`:
```astro
---
import { dict, type Locale } from '../i18n';

interface Props {
  locale: Locale;
}
const t = dict(Astro.props.locale);
---
<a class="cta" href="#basement">{t.cta.discuss}</a>
```

`src/components/TowerPage.astro`:
```astro
---
import { LEVEL_IDS } from '../engine/config';
import type { Locale } from '../i18n';
import CtaButton from './CtaButton.astro';
import ElevatorPanel from './ElevatorPanel.astro';
import Hero from './Hero.astro';
import LevelSection from './LevelSection.astro';
import Stage from './Stage.astro';
import TopBar from './TopBar.astro';

interface Props {
  locale: Locale;
}
const { locale } = Astro.props;
const floors = LEVEL_IDS.slice(1);
---
<Stage />
<TopBar locale={locale} />
<ElevatorPanel locale={locale} />
<main class="tower">
  <Hero locale={locale} />
  {floors.map((id, i) => <LevelSection id={id} index={i + 1} locale={locale} />)}
</main>
<CtaButton locale={locale} />
```

`src/pages/index.astro`:
```astro
---
import TowerPage from '../components/TowerPage.astro';
import { dict } from '../i18n';
import Base from '../layouts/Base.astro';

const t = dict('ru');
---
<Base lang="ru" title={t.meta.title} description={t.meta.description}>
  <TowerPage locale="ru" />
</Base>
```

`src/pages/en/index.astro`:
```astro
---
import TowerPage from '../../components/TowerPage.astro';
import { dict } from '../../i18n';
import Base from '../../layouts/Base.astro';

const t = dict('en');
---
<Base lang="en" title={t.meta.title} description={t.meta.description}>
  <TowerPage locale="en" />
</Base>
```

- [x] **Step 6: Запустить и убедиться, что проходят**

Run: `pnpm vitest run src/i18n/i18n.test.ts`
Expected: PASS.

Run: `pnpm e2e tests/e2e/layout.spec.ts tests/e2e/smoke.spec.ts`
Expected: PASS во всех проектах.

- [x] **Step 7: Commit**

```bash
git add src tests/e2e/layout.spec.ts
git commit -m "feat(site): add tower page layout, dictionaries and styles"
```

---

### Task 9: Этажи-заглушки и стример этажей

**Files:**
- Create: `src/engine/level-asset.ts`, `src/engine/greybox.ts`, `src/engine/level-manager.ts`
- Test: `src/engine/level-asset.test.ts`, `src/engine/greybox.test.ts`, `src/engine/level-manager.test.ts`

**Interfaces:**
- Consumes: `tower`, `levelBaseY`, `TowerConfig` (задача 2); `planStreaming`, `keepWindow`, `LevelStatus` (задача 6).
- Produces: `interface LevelAsset` и `type LevelSource` ровно как в контракте 3.3; `disposeObject3D(root, keep?)`, `withFallback(primary, fallback): LevelSource`; `buildGreyboxLevel(index, cfg?): LevelAsset`, `greyboxSource: LevelSource`; `class LevelManager { constructor(parent, source, total, onChange?, now?); update(position); ready(): number[]; asset(index): LevelAsset | null; dispose() }`.

- [x] **Step 1: Написать падающие тесты**

`src/engine/level-asset.test.ts`:
```ts
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { disposeObject3D, type LevelAsset, type LevelSource, withFallback } from './level-asset';

function asset(name: string): LevelAsset {
  const root = new Group();
  root.name = name;
  return { root, anchors: new Map(), hits: [], dispose: () => {} };
}

describe('disposeObject3D', () => {
  it('disposes geometries, materials and textures', () => {
    const texture = new Texture();
    const material = new MeshBasicMaterial({ map: texture });
    const geometry = new BoxGeometry();
    const root = new Group();
    root.add(new Mesh(geometry, material));
    const spies = [geometry, material, texture].map((item) => {
      const spy = vi.fn();
      item.addEventListener('dispose', spy);
      return spy;
    });
    disposeObject3D(root);
    for (const spy of spies) expect(spy).toHaveBeenCalledOnce();
  });

  it('keeps shared resources alive', () => {
    const shared = new MeshBasicMaterial();
    const spy = vi.fn();
    shared.addEventListener('dispose', spy);
    const root = new Group();
    root.add(new Mesh(new BoxGeometry(), shared));
    disposeObject3D(root, new Set([shared]));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('withFallback', () => {
  it('uses the primary source when it works', async () => {
    const source = withFallback(async () => asset('primary'), async () => asset('fallback'));
    expect((await source(0, new AbortController().signal)).root.name).toBe('primary');
  });

  it('uses the fallback when the primary fails', async () => {
    const failing: LevelSource = async () => {
      throw new Error('404');
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const source = withFallback(failing, async () => asset('fallback'));
    expect((await source(0, new AbortController().signal)).root.name).toBe('fallback');
    warn.mockRestore();
  });

  it('does not fall back after an abort', async () => {
    const controller = new AbortController();
    controller.abort();
    const failing: LevelSource = async () => {
      throw new Error('aborted');
    };
    const source = withFallback(failing, async () => asset('fallback'));
    await expect(source(0, controller.signal)).rejects.toThrow('aborted');
  });
});
```

`src/engine/greybox.test.ts`:
```ts
import { type BufferGeometry, Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { tower } from './config';
import { buildGreyboxLevel } from './greybox';

function meshes(index: number): Mesh[] {
  const result: Mesh[] = [];
  buildGreyboxLevel(index).root.traverse((node) => {
    if (node instanceof Mesh) result.push(node);
  });
  return result;
}

describe('buildGreyboxLevel', () => {
  it('names and positions the level root', () => {
    const level = buildGreyboxLevel(1);
    expect(level.root.name).toBe('level.agents');
    expect(level.root.position.y).toBe(-tower.level.height);
  });

  it('gives floors a back wall, side walls and three stations', () => {
    const names = meshes(2).map((mesh) => mesh.name);
    expect(names).toContain('greybox.back');
    expect(names).toContain('greybox.left');
    expect(names).toContain('greybox.right');
    expect(names.filter((name) => name.startsWith('greybox.station'))).toHaveLength(3);
  });

  it('leaves the roof open', () => {
    expect(meshes(0).map((mesh) => mesh.name)).not.toContain('greybox.back');
  });

  it('disposes every geometry it created', () => {
    const level = buildGreyboxLevel(3);
    const geometries: BufferGeometry[] = [];
    level.root.traverse((node) => {
      if (node instanceof Mesh) geometries.push(node.geometry);
    });
    let disposed = 0;
    for (const geometry of geometries) geometry.addEventListener('dispose', () => disposed++);
    level.dispose();
    expect(disposed).toBe(geometries.length);
  });

  it('rejects an unknown level index', () => {
    expect(() => buildGreyboxLevel(42)).toThrow();
  });
});
```

`src/engine/level-manager.test.ts`:
```ts
import { Group } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { LevelAsset, LevelSource } from './level-asset';
import { LevelManager } from './level-manager';

interface Deferred {
  index: number;
  resolve: (asset: LevelAsset) => void;
  reject: (error: unknown) => void;
}

function fakeAsset(index: number) {
  const root = new Group();
  root.name = `level-${index}`;
  const state = { disposed: false };
  const asset: LevelAsset = {
    root,
    anchors: new Map(),
    hits: [],
    dispose: () => {
      state.disposed = true;
    },
  };
  return { asset, state };
}

function setup(total = 6) {
  const requests: Deferred[] = [];
  const source: LevelSource = (index) =>
    new Promise((resolve, reject) => requests.push({ index, resolve, reject }));
  const parent = new Group();
  const onChange = vi.fn();
  let now = 0;
  const manager = new LevelManager(parent, source, total, onChange, () => now);
  return { requests, parent, onChange, manager, setNow: (t: number) => (now = t) };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('LevelManager', () => {
  it('requests the current level and its neighbour first', () => {
    const { requests, manager } = setup();
    manager.update(0);
    expect(requests.map((r) => r.index)).toEqual([0, 1]);
  });

  it('adds a loaded level to the scene and reports the change', async () => {
    const { requests, parent, onChange, manager } = setup();
    manager.update(0);
    const { asset } = fakeAsset(0);
    requests[0]?.resolve(asset);
    await flush();
    expect(parent.children).toContain(asset.root);
    expect(manager.ready()).toEqual([0]);
    expect(onChange).toHaveBeenCalled();
  });

  it('does not request a level twice while it is loading', () => {
    const { requests, manager } = setup();
    manager.update(0);
    manager.update(0.2);
    const indices = requests.map((r) => r.index);
    expect(indices.slice(0, 2)).toEqual([0, 1]);
    expect(new Set(indices).size).toBe(indices.length);
  });

  it('unloads levels that the lift left behind', async () => {
    const { requests, parent, manager } = setup();
    manager.update(0);
    const roof = fakeAsset(0);
    requests[0]?.resolve(roof.asset);
    requests[1]?.resolve(fakeAsset(1).asset);
    await flush();
    manager.update(4);
    expect(roof.state.disposed).toBe(true);
    expect(parent.children).not.toContain(roof.asset.root);
    expect(manager.ready()).not.toContain(0);
  });

  it('throws away a level that arrives after the lift moved far away', async () => {
    const { requests, parent, manager } = setup();
    manager.update(0);
    manager.update(5);
    const late = fakeAsset(0);
    requests[0]?.resolve(late.asset);
    await flush();
    expect(late.state.disposed).toBe(true);
    expect(parent.children).not.toContain(late.asset.root);
  });

  it('retries a failed level only after a pause', async () => {
    const { requests, manager, setNow } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    manager.update(0);
    requests[0]?.reject(new Error('network'));
    await flush();
    setNow(1000);
    manager.update(0);
    expect(requests.filter((r) => r.index === 0)).toHaveLength(1);
    setNow(7000);
    manager.update(0);
    expect(requests.filter((r) => r.index === 0)).toHaveLength(2);
    warn.mockRestore();
  });

  it('dispose() unloads everything', async () => {
    const { requests, manager } = setup();
    manager.update(0);
    const roof = fakeAsset(0);
    requests[0]?.resolve(roof.asset);
    await flush();
    manager.dispose();
    expect(roof.state.disposed).toBe(true);
    expect(manager.ready()).toEqual([]);
  });
});
```

- [x] **Step 2: Запустить и убедиться, что падают**

Run: `pnpm vitest run src/engine/level-asset.test.ts src/engine/greybox.test.ts src/engine/level-manager.test.ts`
Expected: FAIL — модулей нет.

- [x] **Step 3: Реализация**

`src/engine/level-asset.ts`:
```ts
import type { Material, Mesh, Object3D, Texture } from 'three';

export interface LevelAsset {
  readonly root: Object3D;
  /** Anchor nodes by name without the 'anchor__' prefix. */
  readonly anchors: ReadonlyMap<string, Object3D>;
  /** Invisible hit boxes for pointer interaction. */
  readonly hits: readonly Object3D[];
  /** Per-frame animation of this level (robots and the like). */
  update?(timeSec: number): void;
  dispose(): void;
}

export type LevelSource = (index: number, signal: AbortSignal) => Promise<LevelAsset>;

function isTexture(value: unknown): value is Texture {
  return typeof value === 'object' && value !== null && (value as Texture).isTexture === true;
}

function disposeMaterial(material: Material, keep: ReadonlySet<object>): void {
  if (keep.has(material)) return;
  for (const value of Object.values(material)) {
    if (isTexture(value) && !keep.has(value)) value.dispose();
  }
  const uniforms = (material as { uniforms?: Record<string, { value: unknown }> }).uniforms;
  for (const uniform of Object.values(uniforms ?? {})) {
    if (isTexture(uniform.value) && !keep.has(uniform.value)) uniform.value.dispose();
  }
  material.dispose();
}

/** Frees GPU resources under `root`, except shared ones listed in `keep`. */
export function disposeObject3D(root: Object3D, keep: ReadonlySet<object> = new Set()): void {
  root.traverse((node) => {
    const mesh = node as Partial<Mesh>;
    if (mesh.geometry && !keep.has(mesh.geometry)) mesh.geometry.dispose();
    const material = mesh.material;
    const materials = material === undefined ? [] : Array.isArray(material) ? material : [material];
    for (const item of materials) disposeMaterial(item, keep);
  });
}

/** Uses `fallback` when `primary` fails (missing asset, network error). Aborts propagate. */
export function withFallback(primary: LevelSource, fallback: LevelSource): LevelSource {
  return async (index, signal) => {
    try {
      return await primary(index, signal);
    } catch (error) {
      if (signal.aborted) throw error;
      console.warn(`[tower] level ${index}: primary source failed, using fallback`, error);
      return fallback(index, signal);
    }
  };
}
```

`src/engine/greybox.ts`:
```ts
import {
  BoxGeometry,
  type BufferGeometry,
  Group,
  type Material,
  Mesh,
  MeshLambertMaterial,
  type Object3D,
} from 'three';
import { levelBaseY, type TowerConfig, tower } from './config';
import { disposeObject3D, type LevelAsset, type LevelSource } from './level-asset';

const ACCENTS = ['#f2b33d', '#1fa59a', '#ff5a1f', '#2aabee', '#c9a15b', '#6e6258'] as const;

/** Placeholder level made of boxes: same footprint as the real level, no assets needed. */
export function buildGreyboxLevel(index: number, cfg: TowerConfig = tower): LevelAsset {
  const level = cfg.levels[index];
  if (!level) throw new Error(`No level at index ${index}`);
  const { width, depth, height, slab } = cfg.level;
  const root = new Group();
  root.name = `level.${level.id}`;
  root.position.y = levelBaseY(index, cfg);

  const shell = new MeshLambertMaterial({ color: '#e4d6bf' });
  const floor = new MeshLambertMaterial({ color: '#6e6258' });
  const accent = new MeshLambertMaterial({ color: ACCENTS[index % ACCENTS.length] });
  const add = (geometry: BufferGeometry, material: Material, name: string, x: number, y: number, z: number) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    root.add(mesh);
  };

  const wall = height - slab;
  add(new BoxGeometry(width, slab, depth), floor, 'greybox.floor', 0, -slab / 2, 0);
  if (level.kind !== 'roof') {
    add(new BoxGeometry(width, wall, 0.2), shell, 'greybox.back', 0, wall / 2, -depth / 2 + 0.1);
    add(new BoxGeometry(0.2, wall, depth), shell, 'greybox.left', -width / 2 + 0.1, wall / 2, 0);
    add(new BoxGeometry(0.2, wall, depth), shell, 'greybox.right', width / 2 - 0.1, wall / 2, 0);
  }
  [-3.5, 0, 3.5].forEach((x, i) => {
    add(new BoxGeometry(2, 0.9, 1.1), accent, `greybox.station.${i}`, x, 0.45, -0.8 + (i % 2) * 0.6);
  });

  const anchors = new Map<string, Object3D>();
  return { root, anchors, hits: [], dispose: () => disposeObject3D(root) };
}

export const greyboxSource: LevelSource = async (index) => buildGreyboxLevel(index);
```

`src/engine/level-manager.ts`:
```ts
import type { Object3D } from 'three';
import type { LevelAsset, LevelSource } from './level-asset';
import { keepWindow, type LevelStatus, planStreaming } from './streaming';

const RETRY_AFTER_MS = 5000;
const EVICT_RADIUS = 2;

/** Keeps the levels around the lift loaded and frees the rest. */
export class LevelManager {
  private readonly parent: Object3D;
  private readonly source: LevelSource;
  private readonly onChange: () => void;
  private readonly now: () => number;
  private readonly statuses: LevelStatus[];
  private readonly assets: Array<LevelAsset | null>;
  private readonly controllers: Array<AbortController | null>;
  private readonly failedAt: number[];
  private position = 0;

  constructor(
    parent: Object3D,
    source: LevelSource,
    total: number,
    onChange: () => void = () => {},
    now: () => number = () => performance.now(),
  ) {
    this.parent = parent;
    this.source = source;
    this.onChange = onChange;
    this.now = now;
    this.statuses = Array.from({ length: total }, (): LevelStatus => 'absent');
    this.assets = Array.from({ length: total }, () => null);
    this.controllers = Array.from({ length: total }, () => null);
    this.failedAt = Array.from({ length: total }, () => Number.NEGATIVE_INFINITY);
  }

  update(position: number): void {
    this.position = position;
    const plan = planStreaming(this.statuses, position);
    for (const index of plan.dispose) this.unload(index);
    for (const index of plan.load) {
      const failed = this.failedAt[index] ?? Number.NEGATIVE_INFINITY;
      if (this.now() - failed >= RETRY_AFTER_MS) this.load(index);
    }
  }

  ready(): number[] {
    return this.statuses.flatMap((status, index) => (status === 'ready' ? [index] : []));
  }

  asset(index: number): LevelAsset | null {
    return this.assets[index] ?? null;
  }

  dispose(): void {
    for (const controller of this.controllers) controller?.abort();
    for (const index of this.ready()) this.unload(index);
  }

  private load(index: number): void {
    const controller = new AbortController();
    this.controllers[index] = controller;
    this.statuses[index] = 'loading';
    this.source(index, controller.signal).then(
      (asset) => {
        this.controllers[index] = null;
        if (controller.signal.aborted || !this.isWanted(index)) {
          asset.dispose();
          this.statuses[index] = 'absent';
          return;
        }
        this.parent.add(asset.root);
        this.assets[index] = asset;
        this.statuses[index] = 'ready';
        this.onChange();
      },
      (error: unknown) => {
        this.controllers[index] = null;
        this.statuses[index] = 'absent';
        if (controller.signal.aborted) return;
        this.failedAt[index] = this.now();
        console.warn(`[tower] failed to load level ${index}`, error);
      },
    );
  }

  private unload(index: number): void {
    const asset = this.assets[index];
    if (!asset) return;
    asset.root.removeFromParent();
    asset.dispose();
    this.assets[index] = null;
    this.statuses[index] = 'absent';
    this.onChange();
  }

  private isWanted(index: number): boolean {
    const range = keepWindow(this.position, this.statuses.length, EVICT_RADIUS);
    return index >= range.from && index <= range.to;
  }
}
```

- [x] **Step 4: Запустить и убедиться, что проходят**

Run: `pnpm vitest run src/engine/level-asset.test.ts src/engine/greybox.test.ts src/engine/level-manager.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/engine/level-asset.ts src/engine/level-asset.test.ts src/engine/greybox.ts src/engine/greybox.test.ts src/engine/level-manager.ts src/engine/level-manager.test.ts
git commit -m "feat(engine): stream greybox levels in and out around the lift"
```

---

### Task 10: Камера-риг, шина событий, замер кадров

**Files:**
- Create: `src/engine/camera-rig.ts`, `src/engine/events.ts`, `src/engine/fps-probe.ts`
- Test: `src/engine/camera-rig.test.ts`, `src/engine/events.test.ts`, `src/engine/fps-probe.test.ts`

**Interfaces:**
- Consumes: `cameraPose` (задача 4), `computeFraming`, `Viewport` (задача 4), `damp` (задача 3), `TowerConfig`, `LevelId` (задача 2).
- Produces: `class CameraRig { readonly camera: PerspectiveCamera; readonly position: number; readonly settled: boolean; resize(viewport); setGoal(position, cut?); update(dtSeconds): boolean }`; шина из контракта 3.4: `type TowerEvent`, `type PainId`, `type TowerEventType`, `type TowerEventOf<T>`, `class TowerBus { on(type, handler): () => void; emit(event) }`, `const bus`; `median(values)`, `sampleFrameIntervals(count, warmup?, request?)`.

- [x] **Step 1: Написать падающие тесты**

`src/engine/camera-rig.test.ts`:
```ts
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { cameraPose } from './camera-path';
import { CameraRig } from './camera-rig';
import { tower } from './config';
import { computeFraming } from './framing';

const viewport = { width: 390, height: 844 };

describe('CameraRig', () => {
  it('starts looking at the roof', () => {
    const rig = new CameraRig(tower, viewport);
    const pose = cameraPose(0, computeFraming(viewport, tower.camera, tower.level), tower);
    const toTarget = new Vector3(...pose.target).sub(rig.camera.position).normalize();
    const looking = rig.camera.getWorldDirection(new Vector3());
    expect(looking.dot(toTarget)).toBeCloseTo(1, 6);
  });

  it('glides toward the goal and then settles exactly', () => {
    const rig = new CameraRig(tower, viewport);
    rig.setGoal(2);
    expect(rig.update(0.016)).toBe(true);
    expect(rig.position).toBeGreaterThan(0);
    let steps = 0;
    while (rig.update(0.016) && steps < 600) steps += 1;
    expect(rig.position).toBe(2);
    expect(rig.settled).toBe(true);
    expect(rig.update(0.016)).toBe(false);
  });

  it('cuts straight to the goal when asked', () => {
    const rig = new CameraRig(tower, viewport);
    rig.setGoal(3, true);
    expect(rig.position).toBe(3);
  });

  it('is frame-rate independent', () => {
    const a = new CameraRig(tower, viewport);
    const b = new CameraRig(tower, viewport);
    a.setGoal(2);
    b.setGoal(2);
    a.update(0.008);
    a.update(0.008);
    b.update(0.016);
    expect(a.position).toBeCloseTo(b.position, 9);
  });

  it('applies the portrait view offset on resize', () => {
    const rig = new CameraRig(tower, { width: 1440, height: 900 });
    rig.resize(viewport);
    expect(rig.camera.aspect).toBeCloseTo(390 / 844, 10);
    expect(rig.camera.view?.offsetY ?? 0).toBeGreaterThan(0);
  });
});
```

`src/engine/events.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { TowerBus } from './events';

describe('TowerBus', () => {
  it('delivers events to handlers of that type only', () => {
    const bus = new TowerBus();
    const moved = vi.fn();
    const reached = vi.fn();
    bus.on('lift:moved', moved);
    bus.on('level:reached', reached);
    bus.emit({ type: 'lift:moved', position: 1.5 });
    expect(moved).toHaveBeenCalledWith({ type: 'lift:moved', position: 1.5 });
    expect(reached).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribe', () => {
    const bus = new TowerBus();
    const handler = vi.fn();
    const off = bus.on('deal:run', handler);
    off();
    bus.emit({ type: 'deal:run' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps delivering when one handler throws', () => {
    const bus = new TowerBus();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const second = vi.fn();
    bus.on('agent:enabled', () => {
      throw new Error('boom');
    });
    bus.on('agent:enabled', second);
    bus.emit({ type: 'agent:enabled' });
    expect(second).toHaveBeenCalled();
    error.mockRestore();
  });
});
```

`src/engine/fps-probe.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { median, sampleFrameIntervals } from './fps-probe';

describe('median', () => {
  it('handles odd, even and empty lists', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNaN();
  });
});

describe('sampleFrameIntervals', () => {
  it('skips warm-up frames and returns the requested number of intervals', async () => {
    let time = 0;
    const queue: Array<(t: number) => void> = [];
    const request = (callback: (t: number) => void) => {
      queue.push(callback);
      return queue.length;
    };
    const promise = sampleFrameIntervals(5, 3, request);
    while (queue.length > 0) {
      time += 20;
      queue.shift()?.(time);
    }
    expect(await promise).toEqual([20, 20, 20, 20, 20]);
  });
});
```

- [x] **Step 2: Запустить и убедиться, что падают**

Run: `pnpm vitest run src/engine/camera-rig.test.ts src/engine/events.test.ts src/engine/fps-probe.test.ts`
Expected: FAIL — модулей нет.

- [x] **Step 3: Реализация**

`src/engine/camera-rig.ts`:
```ts
import { PerspectiveCamera } from 'three';
import { cameraPose } from './camera-path';
import type { TowerConfig } from './config';
import { computeFraming, type Framing, type Viewport } from './framing';
import { damp } from './math';

const SETTLE_EPSILON = 1e-4;

/** Perspective camera that rides the lift: smooth by default, instant on request. */
export class CameraRig {
  readonly camera: PerspectiveCamera;
  private readonly cfg: TowerConfig;
  private readonly stiffness: number;
  private framing: Framing;
  private current = 0;
  private goal = 0;

  constructor(cfg: TowerConfig, viewport: Viewport, stiffness = 6) {
    this.cfg = cfg;
    this.stiffness = stiffness;
    this.camera = new PerspectiveCamera(cfg.camera.fovDeg, 1, 0.5, 300);
    this.framing = computeFraming(viewport, cfg.camera, cfg.level);
    this.resize(viewport);
  }

  get position(): number {
    return this.current;
  }

  get settled(): boolean {
    return this.current === this.goal;
  }

  resize(viewport: Viewport): void {
    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    this.framing = computeFraming({ width, height }, this.cfg.camera, this.cfg.level);
    this.camera.aspect = width / height;
    this.camera.setViewOffset(
      width,
      height,
      this.framing.viewOffsetX,
      this.framing.viewOffsetY,
      width,
      height,
    );
    this.camera.updateProjectionMatrix();
    this.apply();
  }

  /** Sets where the lift goes; `cut` jumps there at once (reduced motion, deep links). */
  setGoal(position: number, cut = false): void {
    this.goal = position;
    if (cut) {
      this.current = position;
      this.apply();
    }
  }

  /** Moves toward the goal; returns true while still moving. */
  update(dtSeconds: number): boolean {
    if (this.current !== this.goal) {
      this.current = damp(this.current, this.goal, this.stiffness, dtSeconds);
      if (Math.abs(this.current - this.goal) < SETTLE_EPSILON) this.current = this.goal;
      this.apply();
    }
    return this.current !== this.goal;
  }

  private apply(): void {
    const pose = cameraPose(this.current, this.framing, this.cfg);
    this.camera.position.set(...pose.position);
    this.camera.lookAt(...pose.target);
  }
}
```

`src/engine/events.ts`:
```ts
import type { LevelId } from './config';

export type PainId = 'lost-leads' | 'manual-routine' | 'need-site' | 'need-booking' | 'browsing';

export type TowerEvent =
  | { type: 'lift:moved'; position: number }
  | { type: 'level:reached'; level: LevelId }
  | { type: 'tier:changed'; tier: 'high' | 'lite' | 'static' }
  | { type: 'capsule:selected'; pain: PainId }
  | { type: 'hotspot:activated'; level: LevelId; action: string }
  | { type: 'agent:enabled' }
  | { type: 'deal:run' }
  | { type: 'chat:user-message' }
  | { type: 'chat:agent-reply' }
  | { type: 'chat:tool'; tool: 'get_free_slots' | 'book_call' | 'create_lead' | 'show_case' }
  | { type: 'lead:submitted'; source: 'form' | 'chat' | 'calculator' }
  | { type: 'booking:confirmed'; slotIso: string };

export type TowerEventType = TowerEvent['type'];
export type TowerEventOf<T extends TowerEventType> = Extract<TowerEvent, { type: T }>;

type AnyHandler = (event: TowerEvent) => void;

/** Typed in-page event bus: the only link between the HTML layer, islands and the 3D engine. */
export class TowerBus {
  private readonly handlers = new Map<TowerEventType, Set<AnyHandler>>();

  on<T extends TowerEventType>(type: T, handler: (event: TowerEventOf<T>) => void): () => void {
    const set = this.handlers.get(type) ?? new Set<AnyHandler>();
    const wrapped = handler as AnyHandler;
    set.add(wrapped);
    this.handlers.set(type, set);
    return () => {
      set.delete(wrapped);
    };
  }

  emit(event: TowerEvent): void {
    for (const handler of [...(this.handlers.get(event.type) ?? [])]) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[tower] handler for ${event.type} failed`, error);
      }
    }
  }
}

export const bus = new TowerBus();
```

`src/engine/fps-probe.ts`:
```ts
export function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] ?? Number.NaN;
  return sorted.length % 2 === 1 ? upper : ((sorted[mid - 1] ?? Number.NaN) + upper) / 2;
}

/** Collects `count` frame intervals (ms) after skipping `warmup` frames. */
export function sampleFrameIntervals(
  count: number,
  warmup = 10,
  request: (callback: (timeMs: number) => void) => number = requestAnimationFrame,
): Promise<number[]> {
  return new Promise((resolve) => {
    const intervals: number[] = [];
    let last: number | null = null;
    let seen = 0;
    const step = (time: number) => {
      seen += 1;
      if (last !== null && seen > warmup) intervals.push(time - last);
      last = time;
      if (intervals.length >= count) resolve(intervals);
      else request(step);
    };
    request(step);
  });
}
```

- [x] **Step 4: Запустить и убедиться, что проходят**

Run: `pnpm vitest run src/engine/camera-rig.test.ts src/engine/events.test.ts src/engine/fps-probe.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/engine/camera-rig.ts src/engine/camera-rig.test.ts src/engine/events.ts src/engine/events.test.ts src/engine/fps-probe.ts src/engine/fps-probe.test.ts
git commit -m "feat(engine): add camera rig, typed event bus and frame sampler"
```

---

### Task 11: Запуск движка: boot, app, привязка к скроллу

**Files:**
- Create: `src/engine/signals.ts`, `src/engine/scroll-binding.ts`, `src/engine/boot.ts`, `src/engine/app.ts`
- Modify: `src/components/Stage.astro` (подключить `boot`)
- Test: `src/engine/boot.test.ts`, `tests/e2e/tower.ts` (хелпер), `tests/e2e/engine.spec.ts`, `tests/e2e/static.spec.ts`

**Interfaces:**
- Consumes: всё из задач 2–10.
- Produces: `readTierSignals(win)`; `stableViewportHeight(doc)`, `measureTravels(doc, anchor?)`; `type StoredMode = 'static' | 'live'`, `safeLocalStorage()`, `readStoredMode(storage)`, `writeStoredMode(storage, mode)`, `resolveOverride(forced, stored, auto)`, `boot()`; `type LiveTier`, `interface StartOptions`, `interface TowerHandle { destroy(): void }`, `interface TowerDebug`, `startTower(options): Promise<TowerHandle>`, `window.__tower` при `?debug=1`.

- [x] **Step 1: Написать падающие тесты**

`src/engine/boot.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { readStoredMode, resolveOverride, writeStoredMode } from './boot';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const blocked = {
  getItem(): string | null {
    throw new Error('SecurityError');
  },
  setItem(): void {
    throw new Error('QuotaExceededError');
  },
  removeItem(): void {
    throw new Error('SecurityError');
  },
};

describe('stored mode', () => {
  it('remembers both choices', () => {
    const storage = memoryStorage();
    writeStoredMode(storage, 'static');
    expect(readStoredMode(storage)).toBe('static');
    writeStoredMode(storage, 'live');
    expect(readStoredMode(storage)).toBe('live');
  });

  it('ignores unknown stored values', () => {
    const storage = memoryStorage();
    storage.setItem('tower:mode', 'turbo');
    expect(readStoredMode(storage)).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    expect(readStoredMode(blocked)).toBeNull();
    expect(() => writeStoredMode(blocked, 'static')).not.toThrow();
  });

  it('treats missing storage as no choice', () => {
    expect(readStoredMode(null)).toBeNull();
    expect(() => writeStoredMode(null, 'live')).not.toThrow();
  });
});

describe('resolveOverride', () => {
  it('lets the URL win over the stored choice', () => {
    expect(resolveOverride('lite', 'static', 'high')).toBe('lite');
  });

  it('applies a stored static choice', () => {
    expect(resolveOverride(null, 'static', 'high')).toBe('static');
  });

  it('turns a stored live choice into lite only where the device would go static', () => {
    expect(resolveOverride(null, 'live', 'static')).toBe('lite');
    expect(resolveOverride(null, 'live', 'high')).toBeNull();
  });

  it('returns null without any choice', () => {
    expect(resolveOverride(null, null, 'lite')).toBeNull();
  });
});
```

`tests/e2e/tower.ts`:
```ts
import type { Page } from '@playwright/test';

export interface TowerState {
  position: number;
  tier: string;
  ready: number[];
  drawCalls: number;
  triangles: number;
  frames: number;
}

export function towerState(page: Page): Promise<TowerState | null> {
  return page.evaluate(() => {
    const t = (window as unknown as { __tower?: TowerState }).__tower;
    return t
      ? {
          position: t.position,
          tier: t.tier,
          ready: [...t.ready],
          drawCalls: t.drawCalls,
          triangles: t.triangles,
          frames: t.frames,
        }
      : null;
  });
}

export async function liftAt(page: Page): Promise<number> {
  return (await towerState(page))?.position ?? -1;
}
```

`tests/e2e/engine.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { liftAt, towerState } from './tower';

test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL runs on SwiftShader in Chromium');

test('goes live and rides the lift to the CRM floor', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  expect(await liftAt(page)).toBeCloseTo(0, 1);
  await page.locator('[data-elevator-link="2"]').click();
  await expect.poll(() => liftAt(page), { timeout: 20_000 }).toBeGreaterThan(1.95);
  const state = await towerState(page);
  expect(state?.ready).toContain(2);
  expect(state?.drawCalls).toBeLessThanOrEqual(60);
});

test('a deep link starts at its floor without flying through the tower', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1#crm');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  expect(await liftAt(page)).toBeGreaterThan(1.9);
});

test('keeps the current floor when the phone rotates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?tier=lite&debug=1#booking');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await expect.poll(() => liftAt(page)).toBeGreaterThan(2.9);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(() => liftAt(page), { timeout: 10_000 }).toBeCloseTo(3, 0);
});

test('switches to static mode when the WebGL context is lost', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await page.evaluate(() => {
    (window as unknown as { __tower: { loseContext(): void } }).__tower.loseContext();
  });
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'static');
  await expect(page.locator('#stage canvas')).toHaveCount(0);
});

test('survives back and forward navigation with exactly one canvas', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await page.goto('/en/?tier=lite&debug=1');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await page.goBack();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await expect(page.locator('#stage canvas')).toHaveCount(1);
});

test('the mode toggle switches to static mode and back', async ({ page }) => {
  await page.goto('/?tier=lite');
  const toggle = page.locator('[data-mode-toggle]');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'static');
  await expect(page).toHaveURL(/tier=static/);
  expect(await page.evaluate(() => localStorage.getItem('tower:mode'))).toBe('static');
  await page.locator('[data-mode-toggle]').click();
  // SwiftShader counts as "would be static", so turning 3D back on forces the lite tier.
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'lite');
  expect(await page.evaluate(() => localStorage.getItem('tower:mode'))).toBe('live');
});
```

`tests/e2e/static.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('static tier shows no canvas', async ({ page }) => {
  await page.goto('/?tier=static');
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'static');
  await expect(page.locator('#stage canvas')).toHaveCount(0);
});

test('reduced motion is reflected on <html>', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/?tier=static');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await context.close();
});
```

- [x] **Step 2: Запустить и убедиться, что падают**

Run: `pnpm vitest run src/engine/boot.test.ts`
Expected: FAIL — модуля `./boot` нет.

Run: `pnpm e2e tests/e2e/engine.spec.ts tests/e2e/static.spec.ts --project=desktop-chromium`
Expected: FAIL — `#stage` не переходит в `live`, а `html` остаётся с `data-tier="pending"`.

- [x] **Step 3: Чтение возможностей браузера и привязка к скроллу**

`src/engine/signals.ts`:
```ts
import type { TierSignals } from './tiers';

interface NavigatorHints {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Reads what the browser can do. Creates and immediately releases a probe WebGL2 context. */
export function readTierSignals(win: Window): Omit<TierSignals, 'override'> {
  const nav = win.navigator as Navigator & NavigatorHints;
  let webgl2 = false;
  let gpu: string | null = null;
  try {
    const gl = win.document.createElement('canvas').getContext('webgl2');
    if (gl) {
      webgl2 = true;
      const basic = String(gl.getParameter(gl.RENDERER));
      const info = /webkit webgl|mozilla/i.test(basic)
        ? gl.getExtension('WEBGL_debug_renderer_info')
        : null;
      gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : basic;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    webgl2 = false;
  }
  return {
    webgl2,
    gpu,
    saveData: nav.connection?.saveData === true,
    deviceMemoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
  };
}
```

`src/engine/scroll-binding.ts`:
```ts
import { normalizeTravels, type Travel } from './lift';

/** Height of 100svh in px: stable while mobile browser bars show and hide. */
export function stableViewportHeight(doc: Document): number {
  const probe = doc.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
  doc.body.append(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return height > 0 ? height : (doc.defaultView?.innerHeight ?? 0);
}

/**
 * Travel k runs while the spacer of level k + 1 passes the `anchor` line of the viewport
 * (0.6 = 60% from the top): the lift leaves as the previous text scrolls away.
 */
export function measureTravels(doc: Document, anchor = 0.6): Travel[] {
  const viewport = stableViewportHeight(doc);
  const scrollY = doc.defaultView?.scrollY ?? 0;
  const spacers = Array.from(doc.querySelectorAll<HTMLElement>('[data-lift-travel]'));
  return normalizeTravels(
    spacers.map((spacer) => {
      const rect = spacer.getBoundingClientRect();
      const top = rect.top + scrollY;
      return { start: top - anchor * viewport, end: top + rect.height - anchor * viewport };
    }),
  );
}
```

- [x] **Step 4: Склейка движка**

`src/engine/app.ts`:
```ts
import { Color, DirectionalLight, HemisphereLight, Scene, WebGLRenderer } from 'three';
import { CameraRig } from './camera-rig';
import { tower } from './config';
import { bus } from './events';
import { median, sampleFrameIntervals } from './fps-probe';
import { greyboxSource } from './greybox';
import type { LevelSource } from './level-asset';
import { LevelManager } from './level-manager';
import { liftPosition, type Travel } from './lift';
import { RenderLoop } from './loop';
import { measureTravels } from './scroll-binding';
import { adjustTierByFps, type MotionPolicy, pixelRatioFor, type Tier } from './tiers';

export type LiveTier = Exclude<Tier, 'static'>;

export interface StartOptions {
  stage: HTMLElement;
  tier: LiveTier;
  motion: MotionPolicy;
  /** Measure FPS after the first frame and downgrade if needed. Off when the tier was forced. */
  probeFps: boolean;
  debug: boolean;
  /** 3D must stop (context lost, too slow): the caller switches the page to static mode. */
  onFallback: () => void;
  source?: LevelSource;
}

export interface TowerHandle {
  destroy(): void;
}

export interface TowerDebug {
  readonly position: number;
  readonly tier: LiveTier;
  readonly ready: number[];
  readonly drawCalls: number;
  readonly triangles: number;
  readonly frames: number;
  loseContext(): void;
}

declare global {
  interface Window {
    __tower?: TowerDebug;
  }
}

export async function startTower(options: StartOptions): Promise<TowerHandle> {
  const { stage, motion } = options;
  let tier = options.tier;
  let frames = 0;
  let live = false;
  let reached = -1;
  let destroyed = false;

  const renderer = new WebGLRenderer({
    antialias: tier === 'high',
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(pixelRatioFor(tier, window.devicePixelRatio));
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  stage.append(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color('#f3ebdd');
  scene.add(new HemisphereLight('#fff7ea', '#b9a58c', 2.2));
  const sun = new DirectionalLight('#ffffff', 1.4);
  sun.position.set(-6, 10, 8);
  scene.add(sun);

  const rig = new CameraRig(tower, { width: stage.clientWidth, height: stage.clientHeight });
  let travels: Travel[] = measureTravels(document);
  let lastGoal = liftPosition(window.scrollY, travels);

  const loop = new RenderLoop(renderFrame);
  const levels = new LevelManager(
    scene,
    options.source ?? greyboxSource,
    tower.levels.length,
    () => {
      const animated = levels.ready().some((i) => levels.asset(i)?.update !== undefined);
      loop.setContinuous('ambient', motion.ambient && animated);
      loop.invalidate();
    },
  );

  function renderFrame(dt: number, timeMs: number): void {
    const moving = rig.update(dt);
    levels.update(rig.position);
    if (motion.ambient) {
      for (const index of levels.ready()) levels.asset(index)?.update?.(timeMs / 1000);
    }
    renderer.render(scene, rig.camera);
    frames += 1;
    bus.emit({ type: 'lift:moved', position: rig.position });
    announceLevel();
    if (!moving) loop.setContinuous('camera', false);
    if (!live && levels.ready().includes(Math.round(rig.position))) {
      live = true;
      stage.dataset.state = 'live';
      if (options.probeFps) void probe();
    }
  }

  function announceLevel(): void {
    const nearest = Math.round(rig.position);
    if (nearest === reached || Math.abs(rig.position - nearest) > 0.05) return;
    reached = nearest;
    const id = tower.levels[nearest]?.id;
    if (id) bus.emit({ type: 'level:reached', level: id });
  }

  async function probe(): Promise<void> {
    for (let attempt = 0; attempt < 2 && !destroyed; attempt += 1) {
      loop.setContinuous('probe', true);
      const intervals = await sampleFrameIntervals(60);
      loop.setContinuous('probe', false);
      if (destroyed) return;
      const next = adjustTierByFps(tier, median(intervals));
      if (next === tier) return;
      if (next === 'static') {
        options.onFallback();
        return;
      }
      tier = next;
      renderer.setPixelRatio(pixelRatioFor(tier, window.devicePixelRatio));
      renderer.setSize(stage.clientWidth, stage.clientHeight, false);
      document.documentElement.dataset.tier = tier;
      bus.emit({ type: 'tier:changed', tier });
      loop.invalidate();
    }
  }

  function onScroll(): void {
    const goal = liftPosition(window.scrollY, travels);
    lastGoal = goal;
    rig.setGoal(goal, motion.camera === 'cut');
    levels.update(goal);
    loop.setContinuous('camera', true);
    loop.invalidate();
  }

  function onStageResize(): void {
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    rig.resize({ width: stage.clientWidth, height: stage.clientHeight });
    loop.invalidate();
  }

  /** Content reflowed (rotation, fonts): re-measure, and keep the visitor on the same floor. */
  function onLayoutChange(): void {
    // The old travels are stale after a reflow, so use the last goal computed before it.
    const before = Math.round(lastGoal);
    travels = measureTravels(document);
    const after = Math.round(liftPosition(window.scrollY, travels));
    if (after !== before) {
      const id = tower.levels[before]?.id;
      if (id) document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    onScroll();
  }

  function onVisibility(): void {
    if (document.hidden) loop.stop();
    else {
      loop.start();
      loop.invalidate();
    }
  }

  function onContextLost(event: Event): void {
    event.preventDefault();
    options.onFallback();
  }

  const stageObserver = new ResizeObserver(onStageResize);
  const layoutObserver = new ResizeObserver(onLayoutChange);
  stageObserver.observe(stage);
  const main = document.querySelector('main.tower');
  if (main) layoutObserver.observe(main);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);

  rig.setGoal(lastGoal, true);
  levels.update(rig.position);
  loop.start();
  loop.invalidate();

  if (options.debug) {
    window.__tower = {
      get position() {
        return rig.position;
      },
      get tier() {
        return tier;
      },
      get ready() {
        return levels.ready();
      },
      get drawCalls() {
        return renderer.info.render.calls;
      },
      get triangles() {
        return renderer.info.render.triangles;
      },
      get frames() {
        return frames;
      },
      loseContext: () => renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext(),
    };
  }

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      loop.stop();
      stageObserver.disconnect();
      layoutObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      levels.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      stage.dataset.state = 'poster';
      if (options.debug) delete window.__tower;
    },
  };
}
```

- [x] **Step 5: Стартовый бандл**

`src/engine/boot.ts`:
```ts
import { bus } from './events';
import { readTierSignals } from './signals';
import { decideTier, motionPolicy, parseTierOverride, type Tier } from './tiers';

const MODE_KEY = 'tower:mode';

/** The visitor's explicit choice: 'static' = no 3D, 'live' = 3D even where we would pick static. */
export type StoredMode = 'static' | 'live';

type ModeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function safeLocalStorage(): ModeStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredMode(storage: ModeStorage | null): StoredMode | null {
  try {
    const value = storage?.getItem(MODE_KEY);
    return value === 'static' || value === 'live' ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredMode(storage: ModeStorage | null, mode: StoredMode): void {
  try {
    storage?.setItem(MODE_KEY, mode);
  } catch {
    // Storage blocked: the choice still survives reloads through the ?tier= parameter.
  }
}

/** URL beats the stored choice; a stored 'live' only matters where we would pick static. */
export function resolveOverride(
  forced: Tier | null,
  stored: StoredMode | null,
  auto: Tier,
): Tier | null {
  if (forced) return forced;
  if (stored === 'static') return 'static';
  if (stored === 'live' && auto === 'static') return 'lite';
  return null;
}

function setTier(tier: Tier): void {
  document.documentElement.dataset.tier = tier;
  bus.emit({ type: 'tier:changed', tier });
}

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolve(), { timeout: 1200 });
    } else {
      window.setTimeout(resolve, 200);
    }
  });
}

function wireModeToggle(tier: Tier, auto: Tier, webgl2: boolean, storage: ModeStorage | null): void {
  const button = document.querySelector<HTMLButtonElement>('[data-mode-toggle]');
  if (!button) return;
  if (!webgl2) {
    button.hidden = true;
    return;
  }
  const isStatic = tier === 'static';
  button.textContent =
    (isStatic ? button.dataset.labelLive : button.dataset.labelStatic) ?? button.textContent;
  button.setAttribute('aria-pressed', String(isStatic));
  button.addEventListener('click', () => {
    const next: StoredMode = isStatic ? 'live' : 'static';
    writeStoredMode(storage, next);
    // Mirror the choice in the URL so it also works when storage is blocked.
    const url = new URL(window.location.href);
    if (next === 'static') url.searchParams.set('tier', 'static');
    else if (auto === 'static') url.searchParams.set('tier', 'lite');
    else url.searchParams.delete('tier');
    window.location.replace(url.toString());
  });
}

export async function boot(): Promise<void> {
  const stage = document.getElementById('stage');
  const storage = safeLocalStorage();
  const params = new URLSearchParams(window.location.search);
  const forced = parseTierOverride(window.location.search);
  const signals = readTierSignals(window);
  const auto = decideTier({ ...signals, override: null });
  const tier = decideTier({
    ...signals,
    override: resolveOverride(forced, readStoredMode(storage), auto),
  });
  const motion = motionPolicy(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.documentElement.dataset.motion = motion.camera === 'cut' ? 'reduced' : 'full';
  setTier(tier);
  wireModeToggle(tier, auto, signals.webgl2, storage);
  if (tier === 'static' || !stage) return;

  await whenIdle();
  try {
    const { startTower } = await import('./app');
    let handle: { destroy(): void } | null = null;
    handle = await startTower({
      stage,
      tier,
      motion,
      probeFps: forced === null,
      debug: params.has('debug'),
      onFallback: () => {
        handle?.destroy();
        setTier('static');
      },
    });
  } catch (error) {
    console.warn('[tower] 3D could not start; staying in static mode', error);
    setTier('static');
  }
}
```

`src/components/Stage.astro`:
```astro
<div class="stage" id="stage" data-state="poster" aria-hidden="true"></div>
<script>
  import { boot } from '../engine/boot';

  void boot();
</script>
```

- [x] **Step 6: Запустить и убедиться, что проходят**

Run: `pnpm vitest run src/engine/boot.test.ts`
Expected: PASS.

Run: `pnpm e2e tests/e2e/engine.spec.ts tests/e2e/static.spec.ts tests/e2e/smoke.spec.ts tests/e2e/layout.spec.ts`
Expected: PASS. Тесты движка пропускаются в WebKit (`skipped`), остальные проходят везде.

- [x] **Step 7: Commit**

```bash
git add src/engine/signals.ts src/engine/scroll-binding.ts src/engine/boot.ts src/engine/boot.test.ts src/engine/app.ts src/components/Stage.astro tests/e2e/tower.ts tests/e2e/engine.spec.ts tests/e2e/static.spec.ts
git commit -m "feat(engine): boot the tower lazily and bind the lift to scrolling"
```

---

### Task 12: Панель лифта: активный этаж и стрелка

**Files:**
- Create: `src/ui/elevator.ts`, `src/ui/elevator-panel.ts`
- Modify: `src/components/ElevatorPanel.astro` (подключить скрипт)
- Test: `src/ui/elevator.test.ts`, `tests/e2e/elevator.spec.ts`

**Interfaces:**
- Consumes: `bus` (`lift:moved`), `tower`, `clamp`.
- Produces: `activeLevelIndex(position, total): number`, `needleAngleDeg(position, total, sweepDeg = 180): number`, `initElevatorPanel(doc): () => void`.

- [x] **Step 1: Написать падающие тесты**

`src/ui/elevator.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { activeLevelIndex, needleAngleDeg } from './elevator';

describe('activeLevelIndex', () => {
  it('rounds to the nearest level', () => {
    expect(activeLevelIndex(1.4, 6)).toBe(1);
    expect(activeLevelIndex(1.6, 6)).toBe(2);
  });

  it('clamps and handles NaN', () => {
    expect(activeLevelIndex(-1, 6)).toBe(0);
    expect(activeLevelIndex(9, 6)).toBe(5);
    expect(activeLevelIndex(Number.NaN, 6)).toBe(0);
  });
});

describe('needleAngleDeg', () => {
  it('sweeps from -90 at the roof to +90 at the basement', () => {
    expect(needleAngleDeg(0, 6)).toBe(-90);
    expect(needleAngleDeg(2.5, 6)).toBe(0);
    expect(needleAngleDeg(5, 6)).toBe(90);
  });

  it('copes with a single level', () => {
    expect(needleAngleDeg(0, 1)).toBe(-90);
  });
});
```

`tests/e2e/elevator.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { liftAt } from './tower';

test('marks the floor in view as current (static mode)', async ({ page }) => {
  await page.goto('/?tier=static');
  const links = page.locator('[data-elevator-link]');
  await links.nth(4).click();
  await expect(links.nth(4)).toHaveAttribute('aria-current', 'location');
});

test('follows the lift in 3D mode', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WebGL runs on SwiftShader in Chromium');
  await page.goto('/?tier=lite&debug=1');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  const links = page.locator('[data-elevator-link]');
  await links.nth(2).click();
  await expect.poll(() => liftAt(page)).toBeGreaterThan(1.95);
  await expect(links.nth(2)).toHaveAttribute('aria-current', 'location');
});
```

- [x] **Step 2: Запустить и убедиться, что падают**

Run: `pnpm vitest run src/ui/elevator.test.ts`
Expected: FAIL — модуля `./elevator` нет.

Run: `pnpm e2e tests/e2e/elevator.spec.ts --project=desktop-chromium`
Expected: FAIL — у ссылок нет `aria-current`.

- [x] **Step 3: Реализация**

`src/ui/elevator.ts`:
```ts
import { clamp } from '../engine/math';

export function activeLevelIndex(position: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(Math.round(Number.isFinite(position) ? position : 0), 0, total - 1);
}

/** Dial needle angle: -sweep/2 at the roof, +sweep/2 at the basement. */
export function needleAngleDeg(position: number, total: number, sweepDeg = 180): number {
  const span = Math.max(1, total - 1);
  const t = clamp(Number.isFinite(position) ? position : 0, 0, span) / span;
  return -sweepDeg / 2 + t * sweepDeg;
}
```

`src/ui/elevator-panel.ts`:
```ts
import { tower } from '../engine/config';
import { bus } from '../engine/events';
import { activeLevelIndex, needleAngleDeg } from './elevator';

/** Highlights the current floor and turns the dial. Follows the lift in 3D, the sections in static mode. */
export function initElevatorPanel(doc: Document): () => void {
  const panel = doc.querySelector<HTMLElement>('[data-elevator]');
  if (!panel) return () => {};
  const links = Array.from(panel.querySelectorAll<HTMLAnchorElement>('[data-elevator-link]'));
  const total = tower.levels.length;
  let current = -1;

  const render = (position: number) => {
    panel.style.setProperty('--needle', `${needleAngleDeg(position, total)}deg`);
    const active = activeLevelIndex(position, total);
    if (active === current) return;
    current = active;
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const off = bus.on('lift:moved', (event) => render(event.position));

  const ratios = new Map<number, number>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        ratios.set(Number((entry.target as HTMLElement).dataset.index), entry.intersectionRatio);
      }
      if (doc.documentElement.dataset.tier !== 'static') return;
      let best = 0;
      let bestRatio = -1;
      for (const [index, ratio] of ratios) {
        if (ratio > bestRatio) {
          best = index;
          bestRatio = ratio;
        }
      }
      render(best);
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  for (const section of doc.querySelectorAll<HTMLElement>('section.level[data-index]')) {
    observer.observe(section);
  }

  render(0);
  return () => {
    off();
    observer.disconnect();
  };
}
```

В `src/components/ElevatorPanel.astro` после `</nav>` добавить:
```astro
<script>
  import { initElevatorPanel } from '../ui/elevator-panel';

  initElevatorPanel(document);
</script>
```

- [x] **Step 4: Запустить и убедиться, что проходят**

Run: `pnpm vitest run src/ui/elevator.test.ts`
Expected: PASS.

Run: `pnpm e2e tests/e2e/elevator.spec.ts`
Expected: PASS (3D-тест пропущен в WebKit).

- [x] **Step 5: Commit**

```bash
git add src/ui src/components/ElevatorPanel.astro tests/e2e/elevator.spec.ts
git commit -m "feat(ui): highlight the current floor and turn the elevator dial"
```

---

### Task 13: Бюджеты бандла, CI и Lighthouse

**Files:**
- Create: `scripts/budgets.ts`, `scripts/check-budgets.ts`, `.github/workflows/ci.yml`, `lighthouserc.json`
- Modify: `package.json` (скрипты `budgets`, `verify`)
- Test: `scripts/budgets.test.ts`

**Interfaces:**
- Produces: `parseImports(code): { static: string[]; dynamic: string[] }`, `resolveSpecifier(fromFile, specifier): string`, `closure(entries, edges): Set<string>`, `interface Budget { name; limitBytes; actualBytes }`, `overBudget(budgets): Budget[]`; команда `pnpm budgets`.

- [x] **Step 1: Написать падающий тест**

`scripts/budgets.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { closure, overBudget, parseImports, resolveSpecifier } from './budgets';

describe('parseImports', () => {
  it('finds static and dynamic imports in minified code', () => {
    const code =
      'import{a as b}from"./x.js";import"./y.js";export{c}from"./z.js";const m=()=>import("./app.js");';
    expect(parseImports(code)).toEqual({
      static: ['./x.js', './y.js', './z.js'],
      dynamic: ['./app.js'],
    });
  });

  it('finds dynamic imports written with template literals (Rolldown output)', () => {
    expect(parseImports('const m=()=>import(`./app.B5wRXqJx.js`);').dynamic).toEqual([
      './app.B5wRXqJx.js',
    ]);
  });

  it('ignores property access that looks like import', () => {
    expect(parseImports('foo.import"./nope.js"').static).toEqual([]);
  });
});

describe('resolveSpecifier', () => {
  it('resolves relative and root-absolute paths inside dist', () => {
    expect(resolveSpecifier('_astro/a.js', './b.js')).toBe('_astro/b.js');
    expect(resolveSpecifier('_astro/a.js', '/_astro/c.js')).toBe('_astro/c.js');
    expect(resolveSpecifier('_astro/deep/a.js', '../x.js')).toBe('_astro/x.js');
  });
});

describe('closure', () => {
  it('follows edges and survives cycles', () => {
    const graph: Record<string, string[]> = { a: ['b'], b: ['c', 'a'], c: [] };
    expect([...closure(['a'], (file) => graph[file] ?? [])].sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('overBudget', () => {
  it('returns only the budgets that are exceeded', () => {
    const budgets = [
      { name: 'initial', limitBytes: 100, actualBytes: 90 },
      { name: 'engine', limitBytes: 100, actualBytes: 120 },
    ];
    expect(overBudget(budgets).map((b) => b.name)).toEqual(['engine']);
  });
});
```

- [x] **Step 2: Запустить и убедиться, что падает**

Run: `pnpm vitest run scripts/budgets.test.ts`
Expected: FAIL — модуля `./budgets` нет.

- [x] **Step 3: Реализация**

`scripts/budgets.ts`:
```ts
import { posix } from 'node:path';

const STATIC_IMPORT =
  /(?:^|[^.\w$])(?:import|export)\s*(?:[\w$*{},\s]+?\s*from\s*)?["']([^"']+\.js)["']/g;
const DYNAMIC_IMPORT = /\bimport\(\s*["'`]([^"'`]+\.js)["'`]\s*\)/g;

export function parseImports(code: string): { static: string[]; dynamic: string[] } {
  return {
    static: [...code.matchAll(STATIC_IMPORT)].map((match) => match[1] ?? ''),
    dynamic: [...code.matchAll(DYNAMIC_IMPORT)].map((match) => match[1] ?? ''),
  };
}

/** Resolves an import specifier to a dist-relative POSIX path. */
export function resolveSpecifier(fromFile: string, specifier: string): string {
  if (specifier.startsWith('/')) return posix.normalize(specifier.slice(1));
  return posix.normalize(posix.join(posix.dirname(fromFile), specifier));
}

export function closure(entries: Iterable<string>, edges: (file: string) => string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...entries];
  while (stack.length > 0) {
    const file = stack.pop();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    stack.push(...edges(file));
  }
  return seen;
}

export interface Budget {
  name: string;
  limitBytes: number;
  actualBytes: number;
}

export function overBudget(budgets: readonly Budget[]): Budget[] {
  return budgets.filter((budget) => budget.actualBytes > budget.limitBytes);
}
```

`scripts/check-budgets.ts`:
```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { type Budget, closure, overBudget, parseImports, resolveSpecifier } from './budgets.ts';

const DIST = 'dist';
const KB = 1024;

const read = (file: string) => readFileSync(join(DIST, file));
const gz = (file: string) => gzipSync(read(file), { level: 9 }).length;
const imports = (file: string) => parseImports(read(file).toString('utf8'));

const html = read('index.html').toString('utf8');
const scriptEntries = [...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)].map(
  (match) => resolveSpecifier('index.html', match[1] ?? ''),
);
const inlineImports = [...html.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)]
  .flatMap((match) => parseImports(match[1] ?? '').static)
  .map((specifier) => resolveSpecifier('index.html', specifier));
const styles = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((match) =>
  resolveSpecifier('index.html', match[1] ?? ''),
);

const initial = closure([...scriptEntries, ...inlineImports], (file) =>
  imports(file).static.map((spec) => resolveSpecifier(file, spec)),
);
const lazyEntries = [...initial].flatMap((file) =>
  imports(file).dynamic.map((spec) => resolveSpecifier(file, spec)),
);
const lazy = closure(lazyEntries, (file) =>
  imports(file).static.map((spec) => resolveSpecifier(file, spec)),
);
for (const file of initial) lazy.delete(file);

const sum = (files: Iterable<string>) => [...files].reduce((total, file) => total + gz(file), 0);
const budgets: Budget[] = [
  {
    name: 'HTML + CSS + JS before 3D',
    limitBytes: 120 * KB,
    actualBytes: gzipSync(html, { level: 9 }).length + sum(styles) + sum(initial),
  },
  { name: '3D engine JS (lazy)', limitBytes: 200 * KB, actualBytes: sum(lazy) },
];

for (const budget of budgets) {
  const kb = (bytes: number) => `${(bytes / KB).toFixed(1)} KB`;
  console.log(`${budget.name}: ${kb(budget.actualBytes)} / ${kb(budget.limitBytes)} gzip`);
}
const failed = overBudget(budgets);
if (failed.length > 0) {
  console.error(`Over budget: ${failed.map((budget) => budget.name).join(', ')}`);
  process.exit(1);
}
```

`package.json` — добавить скрипт и включить его в `verify`:
```json
"budgets": "tsx scripts/check-budgets.ts",
"verify": "pnpm lint && pnpm check && pnpm test && pnpm build && pnpm budgets && pnpm e2e"
```

`lighthouserc.json`:
```json
{
  "ci": {
    "collect": {
      "startServerCommand": "pnpm preview --port 4322",
      "url": ["http://localhost:4322/"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05 }]
      }
    },
    "upload": { "target": "filesystem", "outputDir": "./lhci" }
  }
}
```

`.github/workflows/ci.yml`:
```yaml
name: ci
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium webkit
      - run: pnpm verify
      - run: pnpm dlx @lhci/cli@0.15.1 autorun
```

> Lighthouse в CI работает на программном рендерере, поэтому сайт там в режиме Static. Это и нужно: замеряется путь «HTML первым», от которого зависит LCP.

- [x] **Step 4: Запустить и убедиться, что проходит**

Run: `pnpm vitest run scripts/budgets.test.ts`
Expected: PASS.

Run: `pnpm build && pnpm budgets`
Expected: две строки с размерами в пределах лимитов, код выхода 0. Ориентир: стартовый ≈ 10–20 КБ, движок ≈ 130–170 КБ.

Run: `pnpm dlx @lhci/cli@0.15.1 autorun`
Expected: все утверждения пройдены.

- [x] **Step 5: Commit**

```bash
git add scripts package.json lighthouserc.json .github
git commit -m "ci: enforce bundle budgets and Lighthouse thresholds"
```

---

### Task 14: HUD для отладки и прогон на устройствах (ворота 01)

**Files:**
- Create: `src/engine/debug-hud.ts`, `docs/qa/device-matrix.md`
- Modify: `src/engine/app.ts` (в блоке `if (options.debug)` подключить HUD)
- Test: `src/engine/debug-hud.test.ts`

**Interfaces:**
- Consumes: `TowerDebug` (задача 11).
- Produces: `interface HudStats`, `formatHud(stats): string`, `mountDebugHud(parent, read?): () => void`.

- [x] **Step 1: Написать падающий тест**

`src/engine/debug-hud.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { formatHud } from './debug-hud';

describe('formatHud', () => {
  it('shows the numbers testers need on one line', () => {
    expect(
      formatHud({
        fps: 59.6,
        tier: 'high',
        position: 2.345,
        ready: [1, 2, 3],
        drawCalls: 24,
        triangles: 41_234,
      }),
    ).toBe('fps 60 · tier high · lift 2.35 · levels 1,2,3 · calls 24 · tris 41.2k');
  });

  it('shows a dash when no level is ready', () => {
    expect(
      formatHud({ fps: 0, tier: 'lite', position: 0, ready: [], drawCalls: 0, triangles: 0 }),
    ).toContain('levels —');
  });
});
```

- [x] **Step 2: Запустить и убедиться, что падает**

Run: `pnpm vitest run src/engine/debug-hud.test.ts`
Expected: FAIL — модуля `./debug-hud` нет.

- [x] **Step 3: Реализация**

`src/engine/debug-hud.ts`:
```ts
import type { TowerDebug } from './app';

export interface HudStats {
  fps: number;
  tier: string;
  position: number;
  ready: readonly number[];
  drawCalls: number;
  triangles: number;
}

export function formatHud(stats: HudStats): string {
  return [
    `fps ${Math.round(stats.fps)}`,
    `tier ${stats.tier}`,
    `lift ${stats.position.toFixed(2)}`,
    `levels ${stats.ready.join(',') || '—'}`,
    `calls ${stats.drawCalls}`,
    `tris ${(stats.triangles / 1000).toFixed(1)}k`,
  ].join(' · ');
}

/** Small overlay for device testing (?debug=1). FPS counts rendered frames, so scroll while measuring. */
export function mountDebugHud(
  parent: HTMLElement,
  read: () => TowerDebug | undefined = () => window.__tower,
): () => void {
  const element = document.createElement('div');
  element.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:9;padding:4px 8px;border-radius:6px;' +
    'background:rgba(28,27,34,.85);color:#f3ebdd;font:12px/1.4 ui-monospace,monospace;pointer-events:none';
  parent.append(element);
  let lastFrames = read()?.frames ?? 0;
  let lastTime = performance.now();
  const timer = window.setInterval(() => {
    const tower = read();
    if (!tower) return;
    const now = performance.now();
    const fps = ((tower.frames - lastFrames) * 1000) / Math.max(1, now - lastTime);
    lastFrames = tower.frames;
    lastTime = now;
    element.textContent = formatHud({
      fps,
      tier: tower.tier,
      position: tower.position,
      ready: tower.ready,
      drawCalls: tower.drawCalls,
      triangles: tower.triangles,
    });
  }, 500);
  return () => {
    window.clearInterval(timer);
    element.remove();
  };
}
```

`src/engine/app.ts` — в конце блока `if (options.debug) { … }` добавить:
```ts
    void import('./debug-hud').then(({ mountDebugHud }) => mountDebugHud(document.body));
```

`docs/qa/device-matrix.md`:
```markdown
# Прогон на устройствах

**Как запускать:** на ноутбуке `pnpm preview:lan`. Телефон в той же Wi-Fi сети открывает адрес из строки `Network` с `?debug=1` (например `http://192.168.1.10:4321/?debug=1`). Windows может спросить разрешение для Node в брандмауэре — разрешить для частной сети.

**Во встроенных браузерах:** отправить ссылку себе в Telegram, Instagram (Direct) и WhatsApp и открыть её внутри приложения.

**Что мерить:** FPS из HUD **во время непрерывного скролла** (в простое кадры не рисуются — это нормально), уровень `tier`, три полных прохода вниз и вверх без вылета и перезагрузки вкладки.

## Ворота 01 (серая башня)

| Устройство | ОС / браузер | Tier | FPS при скролле | 3 прохода без вылета | Постер → сцена без вспышки | Заметки |
|---|---|---|---|---|---|---|
| iPhone SE (2/3) | iOS / Safari | | | | | |
| iPhone 12–16 | iOS / Safari | | | | | |
| iPhone 12–16 | Telegram (встроенный) | | | | | |
| iPhone 12–16 | Instagram (встроенный) | | | | | |
| Pixel 6a / Galaxy A5x | Android / Chrome | | | | | |
| Galaxy A5x | WhatsApp (встроенный) | | | | | |
| Galaxy A1x / Redmi | Android / Chrome | | | | | |
| iPad | Safari | | | | | |
| Ноутбук (Intel UHD) | Windows / Chrome | | | | | |
| Mac | Safari | | | | | |
| Любой | Firefox | | | | | |

**Критерии прохождения:**
- iPhone 12+ и Pixel 6a-класс: `tier high`, 55–60 FPS при скролле.
- Слабый Android: `tier lite` ≥ 30 FPS либо автоматический переход в `static`.
- Ни одного вылета вкладки за три прохода.
- Встроенные браузеры: страница работает, нижняя кнопка не перекрыта панелями приложения.
- `prefers-reduced-motion` (включить в настройках ОС): камера переключается без пролёта.
```

- [x] **Step 4: Запустить тесты и полный прогон**

Run: `pnpm vitest run src/engine/debug-hud.test.ts`
Expected: PASS.

Run: `pnpm verify`
Expected: всё зелёное.

- [x] **Step 5: Прогон на устройствах (ручной)**

1. `pnpm preview:lan`.
2. Заполнить таблицу в `docs/qa/device-matrix.md` для всех доступных устройств.
3. Если критерий не выполнен — завести задачу с конкретным устройством и цифрами. Чинить до закрытия ворот.

- [x] **Step 6: Commit**

```bash
git add src/engine/debug-hud.ts src/engine/debug-hud.test.ts src/engine/app.ts docs/qa/device-matrix.md
git commit -m "feat(engine): add debug HUD and device test protocol"
```

**Ворота 01 закрыты, когда:** `pnpm verify` и Lighthouse зелёные, таблица устройств заполнена, критерии выполнены. После этого план 02 подключает настоящие этажи вместо заглушек.
