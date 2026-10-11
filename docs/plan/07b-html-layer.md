# План 07b — Этап 1: HTML-слой и панель лифта

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Для других инструментов:** задачи строго по порядку; тест → падает → код → проходит → коммит.

**Goal:** HTML-слой выглядит как продукт студии: сцена видна на первом экране телефона, панель лифта латунная на десктопе и не закрывает сцену на телефоне, колонка текста не наезжает на башню, острова (чат, калькулятор, заявка, бронь) в тёплом стиле сайта, а их тексты — в i18n.

**Architecture:** Общие дизайн-токены и компонентные классы — в новом `src/styles/ui.css`; острова переходят с тёмных Tailwind-строк на эти классы и получают тексты пропсом из словаря (только нужный язык попадает в HTML). Раскладка правится в `global.css`; кадр камеры на десктопе — в `scene/tower.json` (с перегенерацией фикстур камеры для Python).

**Tech Stack:** Astro 7.3.8 · Preact · TypeScript 6.0.3 · Tailwind v4 (только утилиты раскладки) · Vitest 5.0.3 · Playwright 1.64.0

**Spec:** `docs/plan/07-redesign.md` — разделы 3.3 (панель лифта), 3.5 (HTML-слой), 6 (этап 1).

## Global Constraints

- Все тексты — в `src/i18n/ru.ts` и `src/i18n/en.ts` с одинаковыми ключами (тест `i18n.test.ts`).
- Бюджет HTML + CSS + JS до 3D ≤ 120 КБ gzip (сейчас 27,6 КБ); `ChatSheet` грузится `client:load` и входит в этот бюджет.
- Зоны нажатия ≥ 44 px; контраст текста AA; видимый фокус.
- `prefers-reduced-motion`: без анимаций интерфейса, кроме смены состояния.
- Без новых npm-зависимостей. `localStorage` только в `try/catch`.
- Изменение `scene/tower.json` → `pnpm fixtures:camera` и `pnpm art:test:py` в том же коммите (контракт 3.1).

## Review Focus

- **Узкий телефон 360 × 640:** заголовок героя и CTA помещаются в нижнюю часть первого экрана, нет горизонтального скролла. Тест в задаче 3.
- **Английская страница:** в островах нет кириллицы. Тест в задаче 5–8.
- **Клавиатура:** меню верхней панели открывается и закрывается с клавиатуры (Esc), фокус возвращается на кнопку. Тест в задаче 1.
- **Режим Static:** панель лифта следит за секциями без 3D (уже есть), новая шкала на телефоне показывает текущий этаж. Тест в задаче 2.
- **Поворот телефона и десктоп ≥ 1024 px:** колонка текста не пересекает башню. Тест в задаче 4.

---

### Task 1: Верхняя панель — меню, звук и язык

**Files:**
- Modify: `src/components/TopBar.astro`, `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/styles/global.css`, `tests/e2e/engine.spec.ts`
- Create: `src/ui/menu.ts`, `src/ui/menu.test.ts`
- Test: `tests/e2e/topbar.spec.ts`

**Interfaces:**
- Produces: `initMenu(root: ParentNode): () => void` — кнопка `[data-menu-button]` (aria-expanded, aria-controls) показывает/скрывает `[data-menu]` (`hidden`), Esc и клик вне закрывают, фокус возвращается на кнопку.
- i18n: `menu.label`, `sound.on`, `sound.off`.

Что меняется: «Режим без 3D» уходит в меню (кнопка `[data-mode-toggle]` остаётся той же, её логика в `boot.ts` не меняется). Звук — иконка SVG вместо эмодзи, подписи из i18n. Логотип — текст `brand` шрифтом Unbounded.

- [x] **Step 1: Падающие тесты** — `menu.test.ts` на фейковом DOM (по образцу `floor-actions-dom.test.ts`): клик по кнопке снимает `hidden` и ставит `aria-expanded="true"`; Esc закрывает и вызывает `focus()` кнопки; клик вне меню закрывает. `topbar.spec.ts`:

```ts
test('the 3D switch lives in the menu and works from the keyboard', async ({ page }) => {
  await page.goto('/?tier=static');
  const button = page.locator('[data-menu-button]');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-mode-toggle]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-mode-toggle]')).toBeHidden();
  await expect(button).toBeFocused();
});

test('the sound button is labelled in the page language', async ({ page }) => {
  await page.goto('/en/?tier=static');
  await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-label', /sound/i);
});
```

- [x] **Step 2:** → FAIL.
- [x] **Step 3:** реализовать `menu.ts`, разметку и стили; в `engine.spec.ts` перед кликом по `[data-mode-toggle]` открыть меню.
- [x] **Step 4:** PASS, `pnpm verify`. Commit: `feat(ui): move the 3D switch into a top bar menu and label the sound toggle`.

---

### Task 2: Панель лифта — латунь на десктопе, шкала на телефоне

**Files:**
- Modify: `src/components/ElevatorPanel.astro`, `src/ui/elevator.ts`, `src/ui/elevator.test.ts`, `src/ui/elevator-panel.ts`, `src/styles/global.css`
- Test: `tests/e2e/elevator.spec.ts`

**Interfaces:**
- Produces: `liftProgress(position: number, total: number): number` (0 на крыше … 1 в подвале, с ограничением) — для бегунка шкалы; CSS-переменная `--lift` на `[data-elevator]`; `[data-elevator-current]` — подпись текущего этажа (`levels.<id>.name`).

Дизайн:
- *Десктоп (≥ 1024 px, landscape):* латунная панель ар-деко — градиент `#e6c98f → #b88d45`, тонкая окантовка, сверху циферблат со стрелкой, кнопки — круглые латунные «пуговицы» с гравировкой (тень внутрь), текущая светится тёплым (`box-shadow` + `#fff4d6`). При наведении — подпись этажа слева (`::before` из `data-label`).
- *Телефон:* панель 28 px: вертикальная линия-шахта, риски этажей, латунный бегунок, который едет по `--lift`; кнопки-ссылки прозрачные 44 × 44 поверх рисок (зоны нажатия сохраняются); рядом с бегунком — чип с названием текущего этажа.

- [x] **Step 1: Падающие тесты**

```ts
// src/ui/elevator.test.ts (добавить)
describe('liftProgress', () => {
  it('maps the roof to 0, the basement to 1 and clamps outside', () => {
    expect(liftProgress(0, 6)).toBe(0);
    expect(liftProgress(2.5, 6)).toBe(0.5);
    expect(liftProgress(5, 6)).toBe(1);
    expect(liftProgress(9, 6)).toBe(1);
    expect(liftProgress(Number.NaN, 6)).toBe(0);
  });
});
```

```ts
// tests/e2e/elevator.spec.ts (добавить)
test('on a phone the lift panel is a slim rail with the current floor name', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?tier=static#crm');
  const panel = await page.locator('[data-elevator]').boundingBox();
  expect(panel?.width ?? 99).toBeLessThanOrEqual(48);
  await expect(page.locator('[data-elevator-current]')).toHaveText(/3/);
  for (const link of await page.locator('[data-elevator-link]').all()) {
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});
```

- [x] **Step 2:** → FAIL.
- [x] **Step 3:** `liftProgress` в `elevator.ts`; `elevator-panel.ts` выставляет `--lift` и текст `[data-elevator-current]` (названия этажей — из `data-label` ссылок); разметка и CSS.
- [x] **Step 4:** PASS, `pnpm verify`. Commit: `feat(ui): brass lift panel on desktop and a slim rail on phones`.

---

### Task 3: Мобильная раскладка «окно + шторка»

**Files:**
- Modify: `src/styles/global.css`, `src/components/Hero.astro`
- Test: `tests/e2e/layout.spec.ts`

Первый экран телефона: сверху ~55 % — сцена (камера в портрете уже ставит этаж на 33 % высоты), снизу — карточка героя: кикер, заголовок, одна строка, CTA «Спуститься в башню». Выбор боли и кнопка «Включить агента» — ниже, на втором экране. Карточки этажей — «шторки»: скругление сверху 1,5 rem, ручка-полоска, фон без прозрачности под текстом.

- [x] **Step 1: Падающие тесты**

```ts
for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }]) {
  test(`the tower is visible above the hero card at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?tier=static');
    const card = await page.locator('.hero .level__content').boundingBox();
    expect(card?.y ?? 0).toBeGreaterThanOrEqual(viewport.height * 0.45);
    const cta = await page.locator('.hero .button--primary').boundingBox();
    expect((cta?.y ?? 9999) + (cta?.height ?? 0)).toBeLessThanOrEqual(viewport.height);
  });
}
```

- [x] **Step 2:** → FAIL (карточка сейчас начинается под верхней панелью).
- [x] **Step 3:** CSS: `.hero .level__content { margin-top: calc(100svh - <высота карточки>) }` через `min-height: 100svh` у `.hero` + `display: flex; flex-direction: column; justify-content: flex-end` и вынос `.hero__pains` в отдельный блок после первого экрана; размер заголовка героя на телефоне `clamp(1.625rem, 7.4vw, 2.25rem)`; лид — одна-две строки (`max-width: 32ch`); шторки этажей.
- [x] **Step 4:** PASS (+ старые тесты раскладки, safe-area, rotation), `pnpm verify`. Commit: `feat(ui): show the tower above the hero card on phones`.

---

### Task 4: Десктоп — башня слева, текст справа без наложения

**Files:**
- Modify: `scene/tower.json` (`camera.landscape`), `scene/camera-fixtures.json` (генерируется), `src/styles/global.css`, `src/engine/config.test.ts`
- Test: `tests/e2e/layout.spec.ts`

Сейчас башня занимает 0,065–0,615 ширины, а колонка текста начинается с 0,58. Новые правила: `fitWidth 0.5`, `centerX 0.3` (башня 0,05–0,55), колонка с `60vw`, ширина до `34rem`, справа место под панель лифта.

- [x] **Step 1: Падающие тесты**

```ts
// src/engine/config.test.ts (добавить)
it('keeps the tower clear of the desktop text column (starts at 60vw)', () => {
  const { centerX, fitWidth } = tower.camera.landscape;
  expect(centerX + fitWidth / 2).toBeLessThanOrEqual(0.56);
});
```

```ts
// tests/e2e/layout.spec.ts (добавить)
test('on desktop the text column starts right of the tower', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?tier=static#agents');
  const box = await page.locator('#agents').boundingBox();
  expect(box?.x ?? 0).toBeGreaterThanOrEqual(1440 * 0.59);
  const panel = await page.locator('[data-elevator]').boundingBox();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(panel?.x ?? 0);
});
```

- [x] **Step 2:** → FAIL.
- [x] **Step 3:** правки `tower.json` и CSS; `pnpm fixtures:camera`; `pnpm art:test:py`.
- [x] **Step 4:** PASS, `pnpm verify`. Commit: `feat(ui): frame the tower left of the desktop text column`.

---

### Task 5: UI-кит островов и калькулятор

**Files:**
- Create: `src/styles/ui.css` (импорт в `global.css`)
- Modify: `src/islands/Calculator.tsx`, `src/components/LevelSection.astro`, `src/i18n/ru.ts`, `src/i18n/en.ts`
- Test: `tests/e2e/islands.spec.ts`

**Interfaces:**
- Produces: классы `.ui-panel`, `.ui-panel__title`, `.ui-panel__lead`, `.ui-label`, `.ui-input`, `.ui-textarea`, `.ui-segmented` (+ кнопки с `aria-pressed`), `.ui-tile` (опция-флажок), `.ui-btn`, `.ui-btn--primary` (чернила), `.ui-btn--accent` (сигнальный), `.ui-note`, `.ui-alert`, `.ui-result`. Тёплая палитра: фон панели `#fbf8f2`, обводка `rgb(28 27 34 / 0.1)`, активные элементы — чернила/латунь, акцент — сигнальный оранжевый.
- Острова получают тексты пропсом: `<Calculator client:visible copy={d.calc} />`, тип `Dict['calc']`.

- [x] **Step 1: Падающие тесты**

```ts
async function luminance(locator: Locator): Promise<number> {
  return locator.evaluate((el) => {
    const [r, g, b] = getComputedStyle(el).backgroundColor.match(/\d+(\.\d+)?/g)!.map(Number);
    return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255;
  });
}

test('the calculator uses the light theme and English copy on /en/', async ({ page }) => {
  await page.goto('/en/?tier=static');
  const calc = page.locator('[data-testid="calculator"]');
  await hydrated(calc);
  expect(await luminance(calc)).toBeGreaterThan(0.8);
  expect(await calc.innerText()).not.toMatch(/[А-Яа-яЁё]/);
});
```

(если у корня калькулятора нет `data-testid="calculator"` — добавить.)

- [x] **Step 2:** → FAIL (тёмный фон).
- [x] **Step 3:** `ui.css`; `Calculator` на классах кита, тексты — из `copy`; ключи `calc.*` в словарях.
- [x] **Step 4:** PASS, `pnpm verify`. Commit: `feat(ui): add the island UI kit and restyle the calculator`.

---

### Task 6: Форма заявки

**Files:** Modify: `src/islands/LeadForm.tsx` (≤ 250 строк), `src/components/LevelSection.astro`, `src/i18n/*`. Test: `tests/e2e/islands.spec.ts`.

- [x] **Step 1:** тест «светлая тема + нет кириллицы на `/en/`» для `[data-testid="lead-form"]` → FAIL.
- [x] **Step 2:** перевести на кит, тексты в `lead.*`; ссылки на политику — из пропсов.
- [x] **Step 3:** PASS, `pnpm verify`. Commit: `feat(ui): restyle the lead form and move its copy to i18n`.

---

### Task 7: Бронирование

**Files:** Modify: `src/islands/BookingWidget.tsx` → разделить на `BookingWidget.tsx` (загрузка, состояние) и `src/islands/booking/SlotPicker.tsx`, `src/islands/booking/BookingForm.tsx` (каждый ≤ 250 строк); `src/components/LevelSection.astro`, `src/i18n/*`. Test: `tests/e2e/islands.spec.ts`.

- [x] **Step 1:** тест «светлая тема + нет кириллицы на `/en/`» для `#booking-widget` (со слотами из `page.route`) → FAIL.
- [x] **Step 2:** кит, тексты в `booking.*` (включая запасной блок `booking-unavailable` из этапа 0).
- [x] **Step 3:** PASS (все тесты брони, включая отказ API), `pnpm verify`. Commit: `feat(ui): restyle booking, split it into slot picker and form`.

---

### Task 8: Чат с агентом

**Files:** Modify: `src/islands/ChatSheet.tsx` → `ChatSheet.tsx` + `src/islands/chat/ChatMessages.tsx` (≤ 250 строк каждый); `src/components/TowerPage.astro`, `src/i18n/*`. Test: `tests/e2e/chat.spec.ts`.

Шторка чата: на телефоне — снизу на 85 % высоты с ручкой, на десктопе — справа 24 rem; светлая; сообщения агента — карточки, посетителя — чернила; кнопки «Продолжить в Telegram/WhatsApp» — в стиле кита. Esc закрывает, фокус уходит в поле ввода при открытии и возвращается на кнопку панели при закрытии.

- [x] **Step 1:** тесты: светлая тема + нет кириллицы на `/en/`; Esc закрывает и возвращает фокус на `[data-chat-open]` → FAIL.
- [x] **Step 2:** реализация; бюджет до 3D проверить (`pnpm budgets`).
- [x] **Step 3:** PASS, `pnpm verify`. Commit: `feat(ui): restyle the agent chat as a light sheet with keyboard support`.

---

### Task 9: Визуальный прогон и мелочи

**Files:** по результатам; `docs/plan/07b-html-layer.md` (отметки), `docs/plan/07-redesign.md` (статус этапа 1).

- [ ] **Step 1:** скриншоты всех этажей: телефон 390 × 844, 360 × 640, десктоп 1440 × 900, `/en/`; глазами проверить отступы, переносы, контраст.
- [ ] **Step 2:** исправить найденное (каждое — с e2e-проверкой, если это поведение, а не пиксели).
- [ ] **Step 3:** `pnpm verify`. Commit: `fix(ui): polish the HTML layer after the visual pass`.
