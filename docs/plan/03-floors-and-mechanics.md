# План 03 — Этажи и механики

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Для других инструментов:** задачи строго по порядку; тест → падает → код → проходит → коммит. Задачи с Blender требуют запущенного терминала с Blender 4.5 LTS.

**Goal:** Все шесть уровней («Крыша», «Диспетчерская», «Цех CRM», «Календарный зал», «Мастерская», «Подвал») собраны в финальном качестве 3D-фабрикой. На каждом этаже работает главный интерактив. Сквозной сюжет капсулы связывает выбор боли на крыше с пультом команды в подвале.

**Architecture:** Интерактив в браузере строится на модулях без внешних зависимостей (хотспоты по `hit__*`, собственный `tween` на часах рендера, `InstancedMesh` для капсул). В 3D-фабрике (`art/blender/`) скрипт каждого этажа собирает геометрию из `towerlib/kit`, запекает свет через Cycles и проверяет бюджеты контракта 3.2.

**Tech Stack:** Three.js 0.186.1 · Blender 4.5 LTS · Python 3.12 + pytest 9.1.1 · Vitest 5.0.3 · Playwright 1.64.0 · TypeScript 6.0.3

**Spec:** `docs/01-brief.md` (разделы 3.4–3.7), `docs/02-implementation-plan.md` (разделы 3 и 5)

## Global Constraints

- **Без GSAP в 3D:** Все анимации — собственный `tween.ts` на часах цикла рендера (`Loop`).
- **Бюджет draw calls:** ≤ 60 при двух этажах в кадре. Капсулы, табло и конверты — только `InstancedMesh`.
- **Контракт имён GLB:** Только `static`, `screens`, `glow`, `dyn__*`, `anchor__*`, `hit__*` (разделитель `__`, без точек и пробелов).
- **Слов в 3D нет:** Все надписи — в HTML и словарях `ru.ts`/`en.ts`.
- **`sessionStorage` / `localStorage`:** Обращения строго внутри `try/catch`.
- **Reduced motion:** При `prefers-reduced-motion` анимации переключаются скачком, фоновые частицы отключаются.
- **TDD:** Тест → проверка, что падает → реализация → проверка, что проходит → коммит.

---

## Структура файлов этого плана

| Файл | Ответственность |
|---|---|
| `src/engine/interaction/hotspots.ts`, `.test.ts` | Raycaster по `hit__*`, DOM-двойники, haptic feedback |
| `src/engine/tween.ts`, `.test.ts` | Легковесный модуль интерполяций на часах рендера |
| `src/engine/capsules/capsule-pool.ts`, `capsule-path.ts`, `.test.ts` | Пул `InstancedMesh` (≤ 64), движение по трубе и якорям |
| `src/engine/relevance.ts`, `src/ui/pain-picker.ts`, `.test.ts` | Выбор боли, метки «Это про вас», сохранение в сессию |
| `art/blender/levels/roof.py`, `src/engine/levels/roof.ts` | Крыша: антенны, поток сообщений, рычаг «Включить агента» |
| `art/blender/levels/crm.py`, `src/engine/levels/crm.ts` | CRM: конвейер, штампы, картотека, кнопка сделки |
| `art/blender/levels/booking.py`, `src/engine/levels/booking.ts` | Календарный зал: split-flap табло слотов, портье |
| `art/blender/levels/workshop.py`, `src/engine/levels/workshop.ts` | Мастерская: стапель, слайдер этапов разработки |
| `art/team.json`, `art/blender/kit/person.py`, `art/blender/levels/basement.py`, `src/engine/levels/basement.ts` | Подвал: 3 персонажа команды, пульт, док капсулы |
| `src/engine/ambient.ts`, `.test.ts` | Троттлинг 30 FPS в простое, моргание LED, reduced motion |

---

### Task 1: Хотспоты — взаимодействие с 3D через луч и DOM-двойники

**Files:**
- Create: `src/engine/interaction/hotspots.ts`, `src/engine/interaction/hotspots.test.ts`
- Modify: `src/engine/app.ts`

**Interfaces:**
- Produces: `interface HotspotOptions`, `createHotspotManager(options)`
- Events: эмитит `hotspot:activated` с `{ level: LevelId, action: string }`

- [x] **Step 1: Написать падающий тест**
- [x] **Step 2: Запустить тест и убедиться, что падает**
- [x] **Step 3: Реализовать `createHotspotManager`**
- [x] **Step 4: Запустить тест и убедиться, что проходит**
- [x] **Step 5: Интегрировать в `app.ts` и проверить `pnpm verify`**
- [x] **Step 6: Commit**

---

### Task 2: Модуль анимаций `tween` на часах цикла рендера

**Files:**
- Create: `src/engine/tween.ts`, `src/engine/tween.test.ts`

**Interfaces:**
- Produces: `tween(options)`, `TweenManager`, функции плавности (`linear`, `easeOutQuad`, `easeInOutQuad`, `easeOutCubic`, `easeOutBounce`)
- Полный контроль времени через параметр `timeSec` без обращения к реальному таймеру.

- [ ] **Step 1: Написать падающий тест**
- [ ] **Step 2: Запустить тест и убедиться, что падает**
- [ ] **Step 3: Реализовать `tween.ts`**
- [ ] **Step 4: Запустить тест и убедиться, что проходит**
- [ ] **Step 5: Проверить `pnpm verify`**
- [ ] **Step 6: Commit**

---

### Task 3: Капсулы заявки и пневмопочта

**Files:**
- Create: `src/engine/capsules/types.ts`, `src/engine/capsules/capsule-pool.ts`, `src/engine/capsules/capsule-pool.test.ts`
- Modify: `src/engine/app.ts`

**Interfaces:**
- Produces: `CapsulePool`, `createCapsulePool(scene, towerConfig)`, `updateCapsules(timeSec, liftPosition)`
- Ограничение: один `InstancedMesh`, ≤ 64 капсулы, 1 draw call. Цвета мессенджеров (зеленый WhatsApp, голубой Telegram, розовый Instagram).

- [ ] **Step 1: Написать падающий тест**
- [ ] **Step 2: Запустить тест и убедиться, что падает**
- [ ] **Step 3: Реализовать `capsule-pool.ts`**
- [ ] **Step 4: Запустить тест и убедиться, что проходит**
- [ ] **Step 5: Проверить `pnpm verify`**
- [ ] **Step 6: Commit**

---

### Task 4: Выбор боли на крыше и метки «Это про вас»

**Files:**
- Create: `src/engine/relevance.ts`, `src/engine/relevance.test.ts`, `src/ui/pain-picker.ts`, `src/ui/pain-picker.test.ts`
- Modify: `src/components/RoofSection.astro` (или `src/pages/index.astro`)

**Interfaces:**
- Produces: `relevantLevels(pain: PainId): readonly LevelId[]`, `getStoredPain()`, `setStoredPain(pain)`
- Безопасное чтение/запись в `sessionStorage` в блоке `try/catch`.

- [ ] **Step 1: Написать падающие тесты**
- [ ] **Step 2: Запустить тесты и убедиться, что падают**
- [ ] **Step 3: Реализовать `relevance.ts` и `pain-picker.ts`**
- [ ] **Step 4: Запустить тесты и убедиться, что проходят**
- [ ] **Step 5: Проверить `pnpm verify`**
- [ ] **Step 6: Commit**

---

### Task 5: Этаж «Крыша» — антенны, конверты и рычаг «Включить агента»

**Files:**
- Create: `art/blender/levels/roof.py`, `src/engine/levels/roof.ts`, `src/engine/levels/roof.test.ts`
- Output: `src/assets/levels/roof.glb`, `src/assets/levels/roof.lightmap.webp`

- [ ] **Step 1: Написать скрипт сборки крыши `roof.py` с антеннами и рычагом**
- [ ] **Step 2: Собрать уровень через `pnpm art:build roof`**
- [ ] **Step 3: Написать тест контроллера уровня `roof.test.ts`**
- [ ] **Step 4: Реализовать логику дождя сообщений и рычага в `roof.ts`**
- [ ] **Step 5: Проверить `pnpm verify && pnpm art:test`**
- [ ] **Step 6: Commit**

---

### Task 6: Этаж «Цех CRM» — конвейер, штампы и кнопка сделки

**Files:**
- Create: `art/blender/levels/crm.py`, `src/engine/levels/crm.ts`, `src/engine/levels/crm.test.ts`
- Output: `src/assets/levels/crm.glb`, `src/assets/levels/crm.lightmap.webp`

- [ ] **Step 1: Написать скрипт сцены `crm.py` (конвейер, картотеки, штамп, кнопка сделки)**
- [ ] **Step 2: Собрать уровень через `pnpm art:build crm`**
- [ ] **Step 3: Написать тест контроллера уровня `crm.test.ts`**
- [ ] **Step 4: Реализовать движение конвейера и цепочку сделки в `crm.ts`**
- [ ] **Step 5: Проверить `pnpm verify && pnpm art:test`**
- [ ] **Step 6: Commit**

---

### Task 7: Этаж «Календарный зал» — split-flap табло бронирования

**Files:**
- Create: `art/blender/levels/booking.py`, `src/engine/levels/booking.ts`, `src/engine/levels/booking.test.ts`
- Output: `src/assets/levels/booking.glb`, `src/assets/levels/booking.lightmap.webp`

- [ ] **Step 1: Написать скрипт сцены `booking.py` (стойка портье, табло с якорями)**
- [ ] **Step 2: Собрать уровень через `pnpm art:build booking`**
- [ ] **Step 3: Написать тест split-flap табло `booking.test.ts`**
- [ ] **Step 4: Реализовать анимацию перелистывания табло в `booking.ts`**
- [ ] **Step 5: Проверить `pnpm verify && pnpm art:test`**
- [ ] **Step 6: Commit**

---

### Task 8: Этаж «Мастерская» — стапель и слайдер стадий разработки

**Files:**
- Create: `art/blender/levels/workshop.py`, `src/engine/levels/workshop.ts`, `src/engine/levels/workshop.test.ts`
- Output: `src/assets/levels/workshop.glb`, `src/assets/levels/workshop.lightmap.webp`

- [ ] **Step 1: Написать скрипт сцены `workshop.py` (стапель сборки, мониторы, слайдер)**
- [ ] **Step 2: Собрать уровень через `pnpm art:build workshop`**
- [ ] **Step 3: Написать тест состояний мастерской `workshop.test.ts`**
- [ ] **Step 4: Реализовать логику смены состояний «макет → код → прод» в `workshop.ts`**
- [ ] **Step 5: Проверить `pnpm verify && pnpm art:test`**
- [ ] **Step 6: Commit**

---

### Task 9: Этаж «Подвал» — персонажи команды, пульт и док капсулы

**Files:**
- Create: `art/team.json`, `art/blender/kit/person.py`, `art/blender/levels/basement.py`, `src/engine/levels/basement.ts`, `src/engine/levels/basement.test.ts`
- Output: `src/assets/levels/basement.glb`, `src/assets/levels/basement.lightmap.webp`

- [ ] **Step 1: Создать `art/team.json` и генератор параметрических персонажей `person.py`**
- [ ] **Step 2: Написать скрипт сцены `basement.py` с пультом и терминалом дока**
- [ ] **Step 3: Собрать уровень через `pnpm art:build basement`**
- [ ] **Step 4: Написать тест контроллера подвала `basement.test.ts`**
- [ ] **Step 5: Реализовать логику приёма капсулы в `basement.ts`**
- [ ] **Step 6: Проверить `pnpm verify && pnpm art:test`**
- [ ] **Step 7: Commit**

---

### Task 10: Фоновая жизнь, reduced motion и ворота 03

**Files:**
- Create: `src/engine/ambient.ts`, `src/engine/ambient.test.ts`
- Modify: `docs/qa/device-matrix.md` (раздел «Ворота 03»)

- [ ] **Step 1: Написать тест троттлинга 30 FPS и реакции на reduced motion в `ambient.test.ts`**
- [ ] **Step 2: Реализовать менеджер фоновой активности `ambient.ts`**
- [ ] **Step 3: Полная проверка `pnpm verify && pnpm art:test`**
- [ ] **Step 4: Проверить бюджеты этажей и замерить draw calls e2e-тестом**
- [ ] **Step 5: Заполнить раздел «Ворота 03» в `docs/qa/device-matrix.md`**
- [ ] **Step 6: Commit**
