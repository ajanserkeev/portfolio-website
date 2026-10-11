# План 07a — Этап 0: исправление багов черновика

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Для других инструментов:** задачи строго по порядку; тест → падает → код → проходит → коммит. Задача 5 требует Blender 4.5 LTS.

**Goal:** Закрыть баги B1–B12 из аудита `docs/plan/07-redesign.md` (раздел 2.1), кроме перенесённых в поздние этапы, и честно пометить ворота 03 как непройденные.

**Architecture:** Правки точечные, без новой архитектуры. Главное изменение поведения — DOM-двойники хотспотов переезжают из движка (`hotspots.bindDom`) в стартовый модуль `src/ui/floor-actions-dom.ts`, чтобы кнопки работали и в режиме Static. Нижняя панель `Dock` заменяет две плавающие кнопки, которые перекрывали друг друга.

**Tech Stack:** Astro 7.3.8 · TypeScript 6.0.3 · Three.js 0.186.1 · Preact · Vitest 5.0.3 · Playwright 1.64.0 · Blender 4.5 LTS · sharp

**Spec:** `docs/plan/07-redesign.md` (разделы 2.1 и 6, этап 0), контракты — `docs/02-implementation-plan.md` раздел 3.

## Global Constraints

- Все тексты — в `src/i18n/ru.ts` и `src/i18n/en.ts` с одинаковыми ключами. Слов в 3D нет.
- `sessionStorage`/`localStorage` — только в `try/catch`.
- Без новых npm-зависимостей.
- Бюджеты: HTML + CSS + JS до 3D ≤ 120 КБ gzip, JS движка ≤ 200 КБ gzip, этаж ≤ 60 000 треугольников / GLB ≤ 450 КБ / лайтмап ≤ 250 КБ, draw calls ≤ 60.
- `src/assets/levels/*` меняются только через `pnpm art:build`.
- Одна задача = один коммит, Conventional Commits на английском. Перед коммитом `pnpm verify` (для `art/` ещё `pnpm art:test`).

## Перенесено в поздние этапы

| Баг | Куда | Почему |
|---|---|---|
| B3 — лица-экраны у людей | этап 2 (труппа персонажей) | люди заменяются целиком |
| B8 — мобильный первый экран (сцена закрыта) | этап 1 (раскладка «окно + шторка») | это переделка раскладки; здесь только кикер под верхней панелью |
| B10 — механика крыши | этап 5 (крыша) | новая механика, не баг |
| Надписи `RECEPTION DESK` на табло (слова в 3D) | этап 5 (календарный зал) | табло переделывается |

## Предварительно (сделано вместе с этим планом)

- `playwright.config.ts`: e2e на отдельном порту `4331` (`E2E_PORT`). На 4321 обычно работает `pnpm dev`, и Playwright с `reuseExistingServer` тестировал dev-сервер вместо сборки: 7 ложных падений.

## Review Focus

- **Двойной вызов действия:** клик по DOM-кнопке не должен эмитить `hotspot:activated` дважды (раньше биндинг был в движке). Тест в задаче 4.
- **Режим Static:** кнопки «Написать агенту» и «Выбрать время» работают без WebGL; кнопки, которым нужен 3D, скрыты. Тест в задаче 4.
- **Простой движка:** после 5 с без активности анимация по кнопке всё равно проигрывается (цикл рендера просыпается). Тест в задаче 4.
- **API недоступен:** виджет брони показывает понятный запасной путь, а не пустоту. Тест в задаче 6.
- **Узкий экран 360 px:** нижняя панель и карточки не дают горизонтального скролла. Тест в задачах 2 и 3.

---

### Task 1: Шрифты с настоящей кириллицей (B5)

**Причина бага.** `scripts/download-fonts.ts` режет CSS Google Fonts по `@font-face`, а комментарий подмножества (`/* cyrillic */`) стоит *перед* блоком. Метка достаётся следующему блоку, и под именем `*-cyrillic.woff2` сохраняется `cyrillic-ext` (≈ 1 КБ, без основной кириллицы). Кириллица рисуется системным шрифтом, а точки и дефисы — Unbounded.

**Files:**
- Create: `scripts/fonts-lib.ts`, `scripts/fonts-lib.test.ts`, `tests/e2e/typography.spec.ts`
- Modify: `scripts/download-fonts.ts`, `src/styles/fonts.css` (генерируется), `public/fonts/*` (генерируются)

**Interfaces:**
- Produces: `parseGoogleFontsCss(css: string): FontSource[]`, `fontFileName(f: FontSource): string`, `fontFaceCss(f: FontSource): string`

- [x] **Step 1: Падающий тест разбора CSS**

```ts
// scripts/fonts-lib.test.ts
import { describe, expect, it } from 'vitest';
import { fontFaceCss, fontFileName, parseGoogleFontsCss } from './fonts-lib';

const face = (subset: string, url: string, range: string) => `/* ${subset} */
@font-face {
  font-family: 'Manrope';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(${url}) format('woff2');
  unicode-range: ${range};
}
`;

const css =
  face('cyrillic-ext', 'https://f/ext.woff2', 'U+0460-052F') +
  face('cyrillic', 'https://f/cyr.woff2', 'U+0301, U+0400-045F') +
  face('latin-ext', 'https://f/latext.woff2', 'U+0100-02BA') +
  face('latin', 'https://f/lat.woff2', 'U+0000-00FF');

describe('parseGoogleFontsCss', () => {
  it('labels each face with the subset comment that precedes it', () => {
    expect(parseGoogleFontsCss(css)).toEqual([
      { family: 'Manrope', weight: '400', subset: 'cyrillic', url: 'https://f/cyr.woff2', unicodeRange: 'U+0301, U+0400-045F' },
      { family: 'Manrope', weight: '400', subset: 'latin', url: 'https://f/lat.woff2', unicodeRange: 'U+0000-00FF' },
    ]);
  });

  it('names files by family, weight and subset', () => {
    const [cyr] = parseGoogleFontsCss(css);
    expect(cyr && fontFileName(cyr)).toBe('manrope-400-cyrillic.woff2');
  });

  it('writes the unicode-range from the source CSS', () => {
    const [cyr] = parseGoogleFontsCss(css);
    expect(cyr && fontFaceCss(cyr)).toContain('unicode-range: U+0301, U+0400-045F;');
  });
});
```

- [x] **Step 2:** `pnpm vitest run scripts/fonts-lib.test.ts` → FAIL (модуля нет).

- [x] **Step 3: Реализация**

```ts
// scripts/fonts-lib.ts
export interface FontSource {
  family: string;
  weight: string;
  subset: 'latin' | 'cyrillic';
  url: string;
  unicodeRange: string;
}

const WANTED = new Set(['latin', 'cyrillic']);
const FACE = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;

export function parseGoogleFontsCss(css: string): FontSource[] {
  const faces: FontSource[] = [];
  for (const [, subset, body = ''] of css.matchAll(FACE)) {
    if (!subset || !WANTED.has(subset)) continue;
    const family = body.match(/font-family:\s*['"]?([^'";]+)['"]?;/)?.[1]?.trim();
    const weight = body.match(/font-weight:\s*(\d+);/)?.[1];
    const url = body.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    const unicodeRange = body.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
    if (family && weight && url && unicodeRange) {
      faces.push({ family, weight, subset: subset as FontSource['subset'], url, unicodeRange });
    }
  }
  return faces;
}

export function fontFileName(f: FontSource): string {
  return `${f.family.toLowerCase().replace(/\s+/g, '-')}-${f.weight}-${f.subset}.woff2`;
}

export function fontFaceCss(f: FontSource): string {
  return `@font-face {
  font-family: "${f.family}";
  font-style: normal;
  font-weight: ${f.weight};
  font-display: swap;
  src: url("/fonts/${fontFileName(f)}") format("woff2");
  unicode-range: ${f.unicodeRange};
}
`;
}
```

`scripts/download-fonts.ts` переписать на `parseGoogleFontsCss` + `fontFaceCss`; URL: `Unbounded:wght@700`, `Manrope:wght@400;700` (в CSS используются веса 600–800 — без файла 700 браузер рисует фальшивый жирный), `JetBrains+Mono:wght@500`. Удалить старые `public/fonts/*` перед загрузкой.

- [x] **Step 4:** `pnpm vitest run scripts/fonts-lib.test.ts` → PASS. `pnpm tsx scripts/download-fonts.ts`, затем `pnpm biome format --write src/styles/fonts.css`. Проверить: каждый `*-cyrillic.woff2` ≥ 5 КБ.

- [x] **Step 5: e2e-тест кириллицы**

```ts
// tests/e2e/typography.spec.ts
import { expect, test } from '@playwright/test';

test('heading and body fonts carry real Cyrillic glyphs', async ({ page }) => {
  await page.goto('/?tier=static');
  const widths = await page.evaluate(async () => {
    await document.fonts.load('700 40px Unbounded', 'Ж');
    await document.fonts.load('400 40px Manrope', 'Ж');
    const ctx = document.createElement('canvas').getContext('2d');
    const width = (font: string) => {
      if (!ctx) return 0;
      ctx.font = font;
      return ctx.measureText('ЖЩЮ').width;
    };
    return {
      fallback: width('400 40px monospace'),
      unbounded: width('700 40px Unbounded, monospace'),
      manrope: width('400 40px Manrope, monospace'),
    };
  });
  expect(Math.abs(widths.unbounded - widths.fallback)).toBeGreaterThan(2);
  expect(Math.abs(widths.manrope - widths.fallback)).toBeGreaterThan(2);
});
```

- [x] **Step 6:** `pnpm verify` зелёный (бюджет первого экрана ≤ 120 КБ). Commit: `fix(fonts): download the real Cyrillic subsets and add Manrope 700`.

---

### Task 2: Типографика этажей, кикер героя, плашки кейсов (B6, часть B8, B12)

**Files:**
- Modify: `src/styles/global.css`, `src/components/CaseCard.astro`
- Test: `tests/e2e/layout.spec.ts`

- [x] **Step 1: Падающие тесты**

```ts
// tests/e2e/layout.spec.ts (добавить)
import type { Locator } from '@playwright/test';

async function overlap(a: Locator, b: Locator): Promise<boolean> {
  const [ra, rb] = [await a.boundingBox(), await b.boundingBox()];
  if (!ra || !rb) return false;
  return ra.x < rb.x + rb.width && rb.x < ra.x + ra.width && ra.y < rb.y + rb.height && rb.y < ra.y + ra.height;
}

test('floor titles use the heading style', async ({ page }) => {
  await page.goto('/?tier=static');
  const style = await page.locator('#agents-title').evaluate((el) => {
    const c = getComputedStyle(el);
    return { family: c.fontFamily, size: Number.parseFloat(c.fontSize) };
  });
  expect(style.family).toContain('Unbounded');
  expect(style.size).toBeGreaterThanOrEqual(24);
});

test('hero kicker does not run under the top bar on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?tier=static');
  expect(await overlap(page.locator('.topbar__brand'), page.locator('.hero .level__kicker'))).toBe(false);
});

test('case card badges stay inside the card on a 360 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/?tier=static');
  for (const card of await page.locator('.case-card').all()) {
    const box = await card.boundingBox();
    const nda = card.locator('.case-card__nda');
    if (!box || (await nda.count()) === 0) continue;
    const badge = await nda.boundingBox();
    expect(badge && badge.x + badge.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
  }
});
```

- [x] **Step 2:** `pnpm e2e tests/e2e/layout.spec.ts` → три новых теста FAIL.

- [x] **Step 3: Реализация**

```css
/* global.css */
.level__title {
  margin: 0 0 0.625rem;
  font-size: clamp(1.5rem, 5.2vw, 2.25rem);
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.level__lead {
  margin: 0;
  font-size: 1rem;
  line-height: 1.55;
  color: rgb(28 27 34 / 0.78);
  max-width: 46ch;
}

.level__kicker {
  font-family: var(--font-mono);
}

.hero .level__content {
  margin-top: calc(4.25rem + env(safe-area-inset-top));
}
```

В `CaseCard.astro` у `.case-card__top` — `flex-wrap: wrap; gap: 0.5rem`, у `.case-card__nda` — `max-width: 100%`.

- [x] **Step 4:** тесты PASS, `pnpm verify` зелёный. Commit: `fix(ui): style floor titles, clear the top bar and wrap case badges`.

---

### Task 3: Нижняя панель вместо двух плавающих кнопок (B7)

**Files:**
- Create: `src/components/Dock.astro`
- Delete: `src/components/CtaButton.astro`
- Modify: `src/components/TowerPage.astro`, `src/islands/ChatSheet.tsx`, `src/engine/events.ts`, `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/styles/global.css`, `docs/02-implementation-plan.md` (3.4), `tests/e2e/chat.spec.ts`
- Test: `tests/e2e/layout.spec.ts`

**Interfaces:**
- Produces: событие шины `{ type: 'chat:open' }`; i18n `chat.open`, `chat.label`.
- ChatSheet открывается на `chat:open` и на `hotspot:activated` с `level: 'agents', action: 'open-chat'`. Рычаг крыши (`agent:enabled`) чат **больше не открывает**: он закрывал собой анимацию «до/после».

- [x] **Step 1: Падающие тесты**

```ts
// tests/e2e/layout.spec.ts (добавить)
for (const viewport of [{ width: 360, height: 740 }, { width: 1440, height: 900 }]) {
  test(`dock buttons do not overlap at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?tier=static');
    expect(await overlap(page.locator('.dock .cta'), page.locator('[data-chat-open]'))).toBe(false);
  });
}

test('the dock chat button opens the agent chat', async ({ page }) => {
  await page.goto('/?tier=static');
  await page.locator('[data-chat-open]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
```

- [x] **Step 2:** → FAIL (нет `.dock`, `[data-chat-open]`).

- [x] **Step 3: Реализация**

```astro
---
// src/components/Dock.astro
import { dict, type Locale } from '../i18n';

interface Props {
  locale: Locale;
}
const t = dict(Astro.props.locale);
---
<div class="dock">
  <a class="cta" href="#basement">{t.cta.discuss}</a>
  <button type="button" class="dock__chat" data-chat-open aria-label={t.chat.open}>
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
    </svg>
    <span class="dock__chat-label">{t.chat.label}</span>
  </button>
</div>
<script>
  import { bus } from '../engine/events';

  document
    .querySelector('[data-chat-open]')
    ?.addEventListener('click', () => bus.emit({ type: 'chat:open' }));
</script>
```

CSS: `.dock` — fixed снизу, `display: flex; gap: 0.5rem`, слева `1rem`, справа `var(--panel-w) + 1rem` (как раньше у `.cta`); `.cta` теряет `position: fixed` и получает `flex: 1`; `.dock__chat` — круглая 3 rem кнопка цвета `--color-teal`, подпись видна только на десктопе (`.dock__chat-label { display: none }` до 1024 px). На десктопе `.dock` справа внизу, `right: 7rem`. Селектор `html[data-shot] .cta` заменить на `.dock`.

ChatSheet: удалить собственную плавающую кнопку; подписки:

```ts
useEffect(() => {
  const offOpen = bus.on('chat:open', () => setIsOpen(true));
  const offHotspot = bus.on('hotspot:activated', (e) => {
    if (e.level === 'agents' && e.action === 'open-chat') setIsOpen(true);
  });
  return () => {
    offOpen();
    offHotspot();
  };
}, []);
```

У панели чата — `role="dialog"` и `aria-label`, если их ещё нет. В `events.ts` и разделе 3.4 мастер-плана добавить `| { type: 'chat:open' }`. Тесты `tests/e2e/chat.spec.ts`, которые открывали чат по старой кнопке, перевести на `[data-chat-open]`.

- [x] **Step 4:** тесты PASS, `pnpm verify` зелёный. Commit: `fix(ui): merge the CTA and the chat launcher into one bottom dock`.

---

### Task 4: DOM-двойники главных интерактивов (B1)

**Files:**
- Create: `src/ui/floor-actions.ts`, `src/ui/floor-actions.test.ts`, `src/ui/floor-actions-dom.ts`, `src/ui/floor-actions-dom.test.ts`, `src/components/FloorAction.astro`
- Modify: `src/components/LevelSection.astro`, `src/components/Hero.astro`, `src/engine/app.ts`, `src/engine/interaction/hotspots.ts` (+ `.test.ts`: убрать `bindDom`), `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/styles/global.css`, `art/scripts/built-levels.test.ts`
- Test: `tests/e2e/floor-actions.spec.ts`

**Interfaces:**
- Produces: `FLOOR_ACTIONS: Record<LevelId, FloorAction>`, `NEEDS_3D: ReadonlySet<FloorAction>`, `initFloorActions(doc: Document, options?: { vibrate?: (ms: number) => void }): () => void`; i18n `actions.<action>`.
- Меняет: `HotspotManager` больше не содержит `bindDom` (биндинг DOM — только в `initFloorActions`, иначе двойной вызов).

| Этаж | Действие | Нужен 3D |
|---|---|---|
| roof | `toggle-agent` | да |
| agents | `open-chat` | нет |
| crm | `run-deal` | да |
| booking | `open-booking` | нет (прокрутка к виджету брони) |
| workshop | `next-stage` | да |
| basement | `test-capsule` | да |

- [ ] **Step 1: Падающие тесты карты действий**

```ts
// src/ui/floor-actions.test.ts
import { describe, expect, it } from 'vitest';
import { LEVEL_IDS } from '../engine/config';
import { en } from '../i18n/en';
import { ru } from '../i18n/ru';
import { FLOOR_ACTIONS, NEEDS_3D } from './floor-actions';

describe('FLOOR_ACTIONS', () => {
  it('gives every floor one action with a label in both languages', () => {
    for (const id of LEVEL_IDS) {
      const action = FLOOR_ACTIONS[id];
      expect(ru.actions[action].length).toBeGreaterThan(0);
      expect(en.actions[action].length).toBeGreaterThan(0);
    }
  });

  it('keeps chat and booking usable without WebGL', () => {
    expect(NEEDS_3D.has('open-chat')).toBe(false);
    expect(NEEDS_3D.has('open-booking')).toBe(false);
    expect(NEEDS_3D.has('run-deal')).toBe(true);
  });
});
```

Тест DOM-модуля — на фейковом документе (окружение Vitest — node), по образцу существующих тестов `src/ui/*.test.ts`:

```ts
// src/ui/floor-actions-dom.test.ts
import { describe, expect, it, vi } from 'vitest';
import { TowerBus } from '../engine/events';
import { initFloorActions } from './floor-actions-dom';

function fakeDoc() {
  const listeners: Record<string, (e: unknown) => void> = {};
  const button = { getAttribute: (n: string) => ({ 'data-hotspot': 'run-deal', 'data-level': 'crm' })[n] ?? null };
  return {
    doc: {
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        listeners[type] = fn;
      },
      removeEventListener: vi.fn(),
      querySelector: () => null,
    } as unknown as Document,
    click: () => listeners.click?.({ target: { closest: () => button } }),
  };
}

describe('initFloorActions', () => {
  it('emits exactly one hotspot event per click', () => {
    const bus = new TowerBus();
    const seen: string[] = [];
    bus.on('hotspot:activated', (e) => seen.push(`${e.level}:${e.action}`));
    const { doc, click } = fakeDoc();
    initFloorActions(doc, { bus, vibrate: () => {} });
    click();
    expect(seen).toEqual(['crm:run-deal']);
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/ui/floor-actions` → FAIL.

- [ ] **Step 3: Реализация**

```ts
// src/ui/floor-actions.ts
import type { LevelId } from '../engine/config';

export const FLOOR_ACTIONS = {
  roof: 'toggle-agent',
  agents: 'open-chat',
  crm: 'run-deal',
  booking: 'open-booking',
  workshop: 'next-stage',
  basement: 'test-capsule',
} as const satisfies Record<LevelId, string>;

export type FloorAction = (typeof FLOOR_ACTIONS)[LevelId];

export const NEEDS_3D: ReadonlySet<FloorAction> = new Set<FloorAction>([
  'toggle-agent',
  'run-deal',
  'next-stage',
  'test-capsule',
]);
```

```ts
// src/ui/floor-actions-dom.ts
import type { LevelId } from '../engine/config';
import { bus as defaultBus, type TowerBus } from '../engine/events';

interface Options {
  bus?: TowerBus;
  vibrate?: (ms: number) => void;
}

function haptic(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // vibration is optional
  }
}

/** DOM twins of the 3D hotspots: one click = one hotspot:activated, with or without WebGL. */
export function initFloorActions(doc: Document, options: Options = {}): () => void {
  const bus = options.bus ?? defaultBus;
  const vibrate = options.vibrate ?? haptic;
  const onClick = (event: Event) => {
    const button = (event.target as Element | null)?.closest?.('button[data-hotspot][data-level]');
    const level = button?.getAttribute('data-level') as LevelId | null | undefined;
    const action = button?.getAttribute('data-hotspot');
    if (!level || !action) return;
    vibrate(10);
    bus.emit({ type: 'hotspot:activated', level, action });
  };
  const offBooking = bus.on('hotspot:activated', (e) => {
    if (e.action === 'open-booking') {
      doc.querySelector('#booking .level__widget')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  doc.addEventListener('click', onClick);
  return () => {
    doc.removeEventListener('click', onClick);
    offBooking();
  };
}
```

```astro
---
// src/components/FloorAction.astro
import type { LevelId } from '../engine/config';
import { dict, type Locale } from '../i18n';
import { FLOOR_ACTIONS, NEEDS_3D } from '../ui/floor-actions';

interface Props {
  id: LevelId;
  locale: Locale;
}
const { id, locale } = Astro.props;
const action = FLOOR_ACTIONS[id];
---
<button
  type="button"
  class="action-chip"
  data-hotspot={action}
  data-level={id}
  data-needs-3d={NEEDS_3D.has(action) ? '' : undefined}
>
  <span class="action-chip__dot" aria-hidden="true"></span>
  {dict(locale).actions[action]}
</button>
```

Подключить `<FloorAction>` в `LevelSection.astro` (после `.level__lead`) и в `Hero.astro` (после `.hero__actions`); `initFloorActions(document)` вызвать в скрипте `Stage.astro` рядом с `initKeyboardNavigation`. CSS: `.action-chip` — латунная пилюля 44 px с пульсирующей точкой; `html[data-tier="static"] .action-chip[data-needs-3d] { display: none; }`; при reduced motion точка не пульсирует.

i18n (`ru` / `en`):

```ts
actions: {
  'toggle-agent': 'Включить агента',              // 'Switch the agent on'
  'open-chat': 'Написать агенту',                 // 'Message the agent'
  'run-deal': 'Запустить сделку',                 // 'Run a deal'
  'open-booking': 'Выбрать время созвона',        // 'Pick a call slot'
  'next-stage': 'Следующий этап: макет → код → прод', // 'Next stage: mockup → code → live'
  'test-capsule': 'Отправить капсулу на пульт',   // 'Send a capsule to the desk'
},
```

В `app.ts`: удалить `hotspots.bindDom(document)` и `unbindDomHotspots`; добавить подписку

```ts
const unbindHotspot = bus.on('hotspot:activated', (e) => {
  ambient.markActivity();
  if (e.action === 'sort-demo') capsules.launchCapsule({ channel: 'default', durationSec: 2.0 });
  loop.invalidate(2);
});
```

(и вызвать `unbindHotspot()` в `destroy`). В `hotspots.ts` удалить `bindDom` и его тесты.

В `art/scripts/built-levels.test.ts` добавить проверку: в GLB каждого этажа есть узел `hit__*` с `extras.action === FLOOR_ACTIONS[id]` — так сайт и фабрика не разъедутся.

- [ ] **Step 4: e2e**

```ts
// tests/e2e/floor-actions.spec.ts
import { expect, test } from '@playwright/test';
import { towerState } from './tower';

const LEVELS = ['roof', 'agents', 'crm', 'booking', 'workshop', 'basement'];

test('every floor has one keyboard-reachable action button', async ({ page }) => {
  await page.goto('/?tier=high');
  for (const id of LEVELS) {
    await expect(page.locator(`button[data-hotspot][data-level="${id}"]`)).toHaveCount(1);
  }
});

test('the agents action opens the chat without WebGL', async ({ page }) => {
  await page.goto('/?tier=static#agents');
  await page.locator('button[data-hotspot="open-chat"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('static mode hides actions that need the 3D scene', async ({ page }) => {
  await page.goto('/?tier=static');
  await expect(page.locator('button[data-hotspot="run-deal"]')).toBeHidden();
  await expect(page.locator('button[data-hotspot="open-booking"]')).toBeVisible();
});

test('an action wakes the render loop after the scene went idle', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WebGL runs on SwiftShader in Chromium');
  await page.goto('/?tier=lite&debug=1#crm');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  await page.waitForTimeout(6000);
  const before = (await towerState(page))?.frames ?? 0;
  await page.locator('button[data-hotspot="run-deal"]').click();
  await expect.poll(async () => (await towerState(page))?.frames ?? 0).toBeGreaterThan(before + 10);
});
```

- [ ] **Step 5:** `pnpm verify` зелёный. Commit: `fix(ui): add DOM twins for every floor's main 3D action`.

---

### Task 5: Волосы команды и табло бронирования в Blender (B2, B4)

**Причины.** В `person.py` смещения волос, очков и воротника заданы в координатах башни, но объекты привязаны к голове/торсу — смещение складывается дважды (волосы на высоте ≈ 2,1 м вместо 1,3 м). В `props.split_flap_board` детали размечены как будто от центра, а `rounded_box` стоит на `y` — рама уходит в потолок (1,8 → 3,6 м при потолке 3,6 м).

**Files:**
- Modify: `art/blender/towerlib/kit/person.py`, `art/blender/towerlib/kit/props.py`
- Test: `art/tests/blender/test_props.py` (+ новый `art/tests/blender/test_person.py` по образцу `test_robot.py`)
- Output: `src/assets/levels/basement.*`, `src/assets/levels/booking.*`

- [ ] **Step 1: Падающие тесты в Blender**
  - `test_person.py`: после `build_person` нижняя точка мирового bounding box узла `dyn__<id>__head` (с волосами) ≤ 1,45 м; волосы не выше головы больше чем на 0,2 м; воротник внутри высоты торса + 0,1 м.
  - `test_props.py`: верх рамы табло `split_flap_board(at=(0, 1.8, -2.85))` ≤ 2,9 м, низ ≥ 0,7 м; створка `dyn__board__flap` целиком внутри рамы по высоте.
- [ ] **Step 2:** `pnpm art:test:blender` → FAIL.
- [ ] **Step 3: Исправления**
  - `person.py`: `collar at=(0.0, 0.52, 0.0)` (от торса), `hair at=(0.0, 0.30, 0.0)` (от головы), `glasses at=(0.0, 0.17, 0.19)` (от головы).
  - `props.split_flap_board`: рама `place((0, -0.9, 0), at)`, ниша `place((0, -0.8, 0.06), at)`, створка внутри корня `at=(0.0, -0.55, 0.0)`, хитбокс `place((0, -0.95, 0), at)`. Табло центрируется на `at.y`.
- [ ] **Step 4:** `pnpm art:test` → PASS. `pnpm art:build basement`, `pnpm art:build booking` (≈ 3 мин каждый). Проверить скриншотом сайта, что табло целиком в кадре, а волосы на головах.
- [ ] **Step 5:** `pnpm verify` зелёный. Commit: `fix(art): attach team hair to heads and fit the split-flap board under the ceiling`.

---

### Task 6: Favicon и бронь без API (B11)

**Files:**
- Create: `public/favicon.svg`
- Modify: `src/layouts/Base.astro` (`<link rel="icon" href="/favicon.svg" type="image/svg+xml">`), `src/islands/BookingWidget.tsx`
- Test: `tests/e2e/islands.spec.ts`

- [ ] **Step 1: Падающий тест**

```ts
test('booking falls back to other channels when the slots API is down', async ({ page }) => {
  await page.route('**/api/slots**', (route) => route.fulfill({ status: 503, body: '' }));
  await page.goto('/?tier=static#booking');
  await expect(page.getByTestId('booking-unavailable')).toBeVisible();
  await expect(page.getByTestId('booking-unavailable').getByRole('link')).not.toHaveCount(0);
});
```

- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** В `BookingWidget` при ошибке загрузки слотов показывать блок `data-testid="booking-unavailable"`: короткий текст и две ссылки — Telegram (`createTelegramDeepLink` из `src/lib/deeplinks.ts`) и форма заявки (`#basement`). Тексты — в том же месте, где остальные тексты виджета (перенос в i18n — этап 1). `favicon.svg` — латунная башня 32×32 на прозрачном фоне.
- [ ] **Step 4:** PASS, `pnpm verify`. Commit: `fix(ui): add a favicon and a booking fallback when the API is down`.

---

### Task 7: Постеры из настоящей сцены (B9)

**Files:**
- Modify: `scripts/posters.ts` (переписать), `src/components/StaticLevel.astro`, `package.json` (`posters` — без изменений имени)
- Create: `scripts/posters-lib.ts`, `scripts/posters-lib.test.ts`
- Output: `public/posters/*.webp`, `public/og-image.jpg`
- Test: `tests/e2e/static.spec.ts`

**Interfaces:**
- Produces: `posterJobs(base: string, levels: readonly string[]): PosterJob[]`, где `PosterJob = { id: string; url: string; out: string; width: number; height: number; format: 'webp' | 'jpeg' }`.

- [ ] **Step 1: Падающий тест**

```ts
// scripts/posters-lib.test.ts
import { describe, expect, it } from 'vitest';
import { posterJobs } from './posters-lib';

describe('posterJobs', () => {
  it('shoots every level in portrait and the OG image from the agents floor', () => {
    const jobs = posterJobs('http://localhost:4321', ['roof', 'agents']);
    expect(jobs).toEqual([
      { id: 'roof', url: 'http://localhost:4321/?shot=roof', out: 'public/posters/roof.webp', width: 900, height: 1200, format: 'webp' },
      { id: 'agents', url: 'http://localhost:4321/?shot=agents', out: 'public/posters/agents.webp', width: 900, height: 1200, format: 'webp' },
      { id: 'og', url: 'http://localhost:4321/?shot=agents', out: 'public/og-image.jpg', width: 1200, height: 630, format: 'jpeg' },
    ]);
  });
});
```

- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** `posters-lib.ts` с `posterJobs`; `posters.ts`: Chromium (`--use-angle=swiftshader --enable-unsafe-swiftshader`), для каждой задачи — вьюпорт, переход, ожидание `html[data-shot-ready="true"]`, скриншот → sharp (WebP q80 / JPEG q86). Базовый URL — первый аргумент, по умолчанию `http://localhost:4321` (нужен запущенный `pnpm preview`, как у `art:compare`). `StaticLevel.astro`: светлая рамка (`--color-sand-dark`), `alt=""` (блок `aria-hidden`), без тёмного фона.
- [ ] **Step 4: e2e**

```ts
test('static mode shows real floor posters', async ({ page }) => {
  await page.goto('/?tier=static#agents');
  const img = page.locator('[data-static-level="agents"] img');
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(900);
});
```

- [ ] **Step 5:** `pnpm build && pnpm preview`, в другом терминале `pnpm posters`; глазами проверить 6 постеров и OG. `pnpm verify`. Commit: `feat(posters): render floor posters and the OG image from the live scene`.

---

### Task 8: Документация и честный статус ворот

**Files:**
- Modify: `docs/qa/device-matrix.md`, `docs/01-brief.md` (чек-лист раздела 7), `docs/02-implementation-plan.md` (таблица раздела 4), `docs/plan/07-redesign.md` (статус «согласован», ссылка на 07a)

- [ ] **Step 1:** В `device-matrix.md` над таблицей «Ворота 03» — пометка: «Не пройдены: значения не подтверждены реальным прогоном (постеры в момент записи были заглушками). Повторный прогон — ворота 07, план 07». Таблицу оставить как историю.
- [ ] **Step 2:** В брифе снять отметки с пунктов, которые не выполнены: постеры «совпадают со сценой», ручной прогон по матрице, профилирование памяти iPhone, «персонажи: 3 члена команды» (люди с лицами-экранами). Добавить строку «Редизайн: план 07».
- [ ] **Step 3:** В мастер-плане (раздел 4) добавить строку плана 07 со ссылками на `07-redesign.md` и `07a-fixes.md`.
- [ ] **Step 4:** Commit: `docs: mark gate 03 as unverified and register the redesign plan`.
