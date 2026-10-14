# План реализации: портфолио-«Башня»

> Мастер-план. Он связывает бриф (`docs/01-brief.md`) с пошаговыми планами в `docs/plan/`. Здесь: архитектура, контракты между подсистемами, порядок работ и распределение на троих. Код по шагам — в планах подсистем.
>
> Документ самодостаточный: его можно отдать любому AI-инструменту или разработчику без контекста переписки. Правила работы для любого исполнителя — `AGENTS.md` в корне.

---

## 0. Как читать и выполнять

1. Прочитать `docs/01-brief.md` (что и зачем) и этот файл (как устроено).
2. Взять **текущий** план подсистемы из таблицы раздела 4 и выполнять задачи строго по порядку. Каждая задача — тест → реализация → проверка → коммит. Отмечать чекбоксы `- [ ]` → `- [x]` в файле плана.
3. Если план расходится с реальностью (другая версия API, команда не работает), исправить план в том же коммите и коротко записать причину в задаче.
4. Детальные планы 03–06 пишутся **после ворот плана 02**: их детали зависят от того, как пройдёт калибровка 3D-фабрики. Ниже для них уже зафиксированы цели, файлы, контракты и критерии готовности.

---

## 1. Архитектура

```
┌──────────────────────────── Браузер ────────────────────────────┐
│                                                                 │
│  HTML-слой (Astro, статика)   ← первый экран, SEO, весь текст   │
│    секции этажей · панель лифта · CTA · кейсы                   │
│        │ scroll                         ▲ события (шина)        │
│        ▼                                │                       │
│  boot.ts (≈5 КБ): уровень качества, режим «без 3D»              │
│        │ динамический import, когда браузер свободен            │
│        ▼                                                        │
│  3D-движок (three.js, ≤ 200 КБ gzip)                            │
│    камера-лифт · стример этажей · цикл рендера по требованию    │
│    материалы: «цвет × лайтмап», matcap, экраны                  │
│        ▲ GLB + WebP по этажам                                   │
│  Острова Preact (лениво): чат, калькулятор, бронь, форма        │
│        │ fetch / SSE                                            │
└────────┼────────────────────────────────────────────────────────┘
         ▼
┌──────── API (Node + Hono, Docker, VPS в РК) ────────┐
│ /api/chat (SSE) · /api/lead · /api/slots · /api/book │──► Anthropic API (Claude)
│ лимиты · бюджет · SQLite (node:sqlite)               │──► Telegram Bot API
└──────────────────────────────────────────────────────┘──► CRM (amoCRM/Bitrix24) · календарь

┌──── «3D-фабрика» (офлайн, у того, кто собирает 3D) ────┐
│ Python-кит → Blender 4.5 LTS (фон) → запекание Cycles   │
│ → GLB + лайтмап → gltf-transform (Meshopt) → WebP       │
│ → src/assets/levels/*  (коммитятся в репозиторий)       │
└─────────────────────────────────────────────────────────┘
```

**Ключевые решения** (обоснования — в брифе, разделы 3.8, 3.9, 3.12):

- **HTML первым.** Весь текст живёт в DOM, canvas декоративен (`aria-hidden`) и грузится вторым.
- **Камера-лифт — чистая функция от скролла:** `liftPosition(scrollY, travels)`. Плавность даёт экспоненциальное догоняние, а не перехват скролла.
- **Этажи стримятся:** в памяти текущий ±1, выгрузка с гистерезисом ±2.
- **Свет отдельно от цвета:** цвет в вершинах (`COLOR_0`), свет в лайтмапе (WebP), собственный шейдер `albedo × lightmap × headroom`.
- **Уровни качества:** High / Lite / Static. Решение принимается по возможностям устройства и замеру FPS. Static показывает картинки вместо WebGL.
- **API переносимый (Hono).** Хостинг — VPS в Казахстане: Cloudflare в РФ замедляется, Anthropic API из РФ недоступен.

---

## 2. Структура репозитория

```
/
├─ AGENTS.md                     правила для AI-инструментов и разработчиков
├─ docs/
│  ├─ 01-brief.md                бриф
│  ├─ 02-implementation-plan.md  этот файл
│  ├─ plan/                      пошаговые планы подсистем (01…06)
│  └─ qa/device-matrix.md        результаты прогонов на устройствах
├─ scene/
│  ├─ tower.json                 единый источник геометрии башни и камеры
│  └─ camera-fixtures.json       эталонные позы камеры (TS ↔ Python)
├─ src/
│  ├─ pages/                     index.astro (ru), en/index.astro, позже cases/*
│  ├─ layouts/  components/      Astro-компоненты HTML-слоя
│  ├─ i18n/                      словари ru/en (все тексты сайта)
│  ├─ styles/global.css          токены палитры, раскладка
│  ├─ ui/                        поведение панели лифта и др. (без three.js)
│  ├─ engine/                    3D-движок (TypeScript, без фреймворка)
│  │  ├─ config.ts  math.ts  lift.ts  framing.ts  camera-path.ts      чистая логика
│  │  ├─ tiers.ts  streaming.ts  loop.ts  events.ts  fps-probe.ts      чистая логика
│  │  ├─ boot.ts  signals.ts                     стартовый бандл (без three.js)
│  │  ├─ app.ts  camera-rig.ts  level-manager.ts  scroll-binding.ts    ленивый бандл
│  │  ├─ greybox.ts  level-asset.ts  glb-source.ts  assets.ts
│  │  ├─ materials/              baked.ts, shared.ts
│  │  └─ actors/                 роботы и прочие анимации
│  ├─ islands/                   Preact-виджеты (план 05)
│  └─ assets/
│     ├─ levels/                 <level>.glb + <level>.lightmap.webp (собирает фабрика)
│     └─ textures/               matcap.webp, screens.webp, faces.webp
├─ art/                          «3D-фабрика»
│  ├─ blender/towerlib/          core/ (чистый Python) + kit/ (bpy) + bake/rig/export
│  ├─ blender/levels/            один скрипт на этаж
│  ├─ screens/  faces/           исходники атласов экранов и лиц роботов
│  ├─ scripts/                   Node-скрипты: build, optimize, контракт, атласы
│  └─ tests/                     pytest + тесты внутри Blender
├─ api/                          Hono-приложение (план 05)
├─ scripts/                      проверка бюджетов и пр.
└─ tests/e2e/                    Playwright
```

---

## 3. Контракты между подсистемами

Контракты меняются только вместе с их тестами и этим разделом.

### 3.1. `scene/tower.json`

Единый источник размеров башни и камеры для TypeScript (сайт) и Python (фабрика).

- **Координаты:** метры, ось Y вверх, как в three.js/glTF. Фронт разреза смотрит в **+Z**, на камеру.
- **Уровень** `index` (0 — крыша, 5 — подвал): верх пола на `y = -index × level.height`, центр пола в `x = 0, z = 0`. Пол занимает `x ∈ [-width/2, width/2]`, `z ∈ [-depth/2, depth/2]`, задняя стена на `z = -depth/2`.
- **Порядок `levels`** фиксирован: `roof, agents, crm, booking, workshop, basement`.
- **Камера:** `fovDeg` (вертикальный), `pitchDeg`, `yawDeg`, `targetHeight`, `travelBulge` (отъезд камеры в середине перегона), правила кадра `portrait` / `landscape`.
- **Шахта лифта** `shaft: { x, z, width, depth }` — объём в переднем левом углу каждого этажа, через всю высоту башни. Её строит движок (план 07d); на этажах в этом объёме ничего не ставится (тест `art/tests/blender/test_shaft_clearance.py`).
- Python переводит координаты в систему Blender функцией `to_blender((x, y, z)) = (x, -z, y)` (обратная к экспорту glTF «+Y up»).

### 3.2. GLB-этаж

Файлы: `src/assets/levels/<levelId>.glb` + `src/assets/levels/<levelId>.lightmap.webp`.

> **Имена узлов используют разделитель `__`.** GLTFLoader в three.js вырезает из имён `.` `:` `/` `[` `]` и пробелы (`PropertyBinding.sanitizeNodeName`), поэтому точки в именах запрещены.

| Узел | Что это | Атрибуты | Материал в рантайме |
|---|---|---|---|
| `static` | Вся неподвижная геометрия этажа, склеена в один меш | `POSITION`, `COLOR_0` (альбедо, линейный), `TEXCOORD_0` (UV лайтмапа); **без** `NORMAL` | `BakedMaterial`: `albedo × lightmap × headroom` |
| `screens` | Все экраны этажа, один меш | `POSITION`, `TEXCOORD_0` (в атлас `screens.webp`) | `MeshBasicMaterial({ map: screens })` |
| `glow` | Лампы, светодиоды — светящиеся статичные детали | `POSITION`, `COLOR_0` | `MeshBasicMaterial({ vertexColors })` |
| `dyn__<id>` | Корень подвижного объекта (пустой узел), `extras.role`, `extras.activity` | — | — |
| `dyn__<id>__<part>` | Подвижная деталь (`body`, `head`, `arm-l`, `arm-r`) | `POSITION`, `NORMAL`, `COLOR_0` | `MeshMatcapMaterial({ matcap, vertexColors })` |
| `dyn__<id>__face` | Экран-лицо робота | `POSITION`, `NORMAL`, `TEXCOORD_0` (ячейка 0 атласа лиц) | `MeshBasicMaterial({ map: faces })` + смещение UV |
| `anchor__<name>` | Пустой узел-якорь (точки капсул, станции, привязка HTML) | `extras` по необходимости | — |
| `hit__<name>` | Невидимый хитбокс для кликов, `extras.action` | `POSITION` | скрыт (`visible = false`) |

- Регулярное выражение имён: `^(static|screens|glow|dyn__[a-z0-9-]+(__[a-z0-9-]+)?|anchor__[a-z0-9-]+(__[a-z0-9-]+)*|hit__[a-z0-9-]+)$`.
- **Лайтмап:** sRGB PNG → WebP. Хранит `irradiance × exposure / headroom`, `headroom = 2.0` (`LIGHTMAP_HEADROOM`). Загружается с `flipY = false` и `colorSpace = SRGBColorSpace`.
- **Бюджет на этаж:** ≤ 60 000 треугольников, GLB ≤ 450 КБ, лайтмап ≤ 250 КБ (итого ≤ 700 КБ на первую сцену). Проверяется `art/scripts/level-contract.ts` при сборке и в тестах.
- **Слов в 3D нет** — надписи только в HTML (i18n).

### 3.2.1. Файл труппы `src/assets/cast.glb`

Люди башни (план 07, этап 2). Собирается `pnpm art:cast` из `art/cast.json` и CC0-исходников `art/vendor/kenney-mini-characters/`; проверяется `art/scripts/cast-contract.ts`.

| Узел | Что это |
|---|---|
| `cast__<id>` | Скелет персонажа (кости `root`, `torso`, `head`, `arm-left`, `arm-right`, `leg-left`, `leg-right`) |
| `cast__<id>__mesh` | Единственный меш персонажа, скинированный; `POSITION`, `NORMAL`, `TEXCOORD_0` (общая текстура-палитра WebP), `JOINTS_0`, `WEIGHTS_0`. В рантайме — `MeshMatcapMaterial({ matcap, map })` |
| анимации | Общие для всех: клипы адресуют кости по имени, поэтому подходят любому `cast__<id>`. Обязателен `idle` |

- Бюджет: ≤ 3 000 треугольников на персонажа, файл ≤ 350 КБ.
- GLTFLoader делает повторяющиеся имена узлов уникальными (`leg-left_1`); движок после загрузки возвращает костям исходные имена.
- Этаж ставит людей пустыми узлами `anchor__cast__<слот>` с `extras.character` (id из `art/cast.json`), `extras.clip` (по умолчанию `idle`), `extras.speed` (по умолчанию 1).

### 3.3. Интерфейс уровня в движке (`src/engine/level-asset.ts`)

```ts
export interface LevelAsset {
  readonly root: Object3D;                         // добавляется в сцену стримером
  readonly anchors: ReadonlyMap<string, Object3D>; // имя без префикса 'anchor__'
  readonly hits: readonly Object3D[];              // невидимые хитбоксы
  update?(timeSec: number): void;                  // анимации этажа (роботы и т. п.)
  dispose(): void;                                 // освобождает GPU-ресурсы этажа
}
export type LevelSource = (index: number, signal: AbortSignal) => Promise<LevelAsset>;
```

Источники: `buildGreyboxLevel` (план 01), `createGlbSource` (план 02). Склейка — `withFallback(glb, greybox)`: нет файла этажа → «серая коробка» вместо падения.

### 3.4. Шина событий башни (`src/engine/events.ts`)

```ts
export type TowerEvent =
  | { type: 'lift:moved'; position: number }
  | { type: 'level:reached'; level: LevelId }   // лифт поравнялся с этажом (в том числе проездом)
  | { type: 'lift:arrived'; level: LevelId }    // лифт остановился на этаже: двери, «дзынь»
  | { type: 'actor:tapped'; level: LevelId; actor: string }   // тап по человеку (слот каста) или роботу
  | { type: 'hint:moved'; level: LevelId; action: string; x: number; y: number; visible: boolean }
    // где на экране (CSS px) главный объект этажа — для HTML-подсказки src/ui/pins.ts
  | { type: 'tier:changed'; tier: 'high' | 'lite' | 'static' }
  | { type: 'capsule:selected'; pain: PainId }
  | { type: 'hotspot:activated'; level: LevelId; action: string }
  | { type: 'agent:enabled' }
  | { type: 'deal:run' }
  | { type: 'chat:open' }
  | { type: 'chat:user-message' }
  | { type: 'chat:agent-reply' }
  | { type: 'chat:tool'; tool: 'get_free_slots' | 'book_call' | 'create_lead' | 'show_case' }
  | { type: 'lead:submitted'; source: 'form' | 'chat' | 'calculator' }
  | { type: 'booking:confirmed'; slotIso: string };
export type PainId = 'lost-leads' | 'manual-routine' | 'need-site' | 'need-booking' | 'browsing';
```

HTML-слой, острова и движок общаются только через шину (`bus.on`, `bus.emit`), не импортируя друг друга. Аналитика (план 06) подписывается на ту же шину.

### 3.5. DOM-контракт

| Элемент / атрибут | Кто пишет | Значение |
|---|---|---|
| `html[data-tier]` | boot / движок | `pending` → `high` / `lite` / `static` |
| `html[data-motion]` | boot | `full` / `reduced` |
| `#stage[data-state]` | движок | `poster` → `live`, когда первый этаж отрисован |
| `section.level[data-level][data-index]` | Astro | секция этажа |
| `.level__content#<levelId>` | Astro | якорь для ссылок `#<levelId>` |
| `[data-lift-travel]` | Astro | «перегон»: пока он проезжает экран, лифт едет к этому этажу |
| `[data-elevator-link="<index>"]` | Astro | кнопка этажа на панели лифта |
| `[data-mode-toggle]` | Astro | переключатель «без 3D» (`data-label-static`, `data-label-3d`) |
| `?tier=high\|lite\|static` | URL | принудительный уровень качества (поддержка, тесты) |
| `?debug=1` | URL | `window.__tower` (состояние) + HUD с FPS |
| `?shot=<levelId>` | URL | режим кадра для постеров и калибровки (план 02, задача 11) |

### 3.6. HTTP API (детали — план 05)

| Метод | Путь | Вход → выход |
|---|---|---|
| `POST` | `/api/chat` | `{ sessionId, message, locale, pain? }` → SSE: `delta {text}`, `tool {name, status, payload}`, `done`, `error {code}` |
| `POST` | `/api/lead` | `{ name, contact, channel, message?, pain?, services[], estimate?, consent: true, locale, sessionId?, hp, startedAt }` → `201 { id }` |
| `GET` | `/api/slots` | `?from=YYYY-MM-DD&days=7&tz=Asia/Almaty` → `{ slots: [{ start, end }] }` |
| `POST` | `/api/book` | `{ slotStart, name, contact, channel, consent: true, locale, sessionId?, hp?, startedAt? }` → `201 { ok, id, status }` / `400 CONSENT_REQUIRED` / `409 SLOT_UNAVAILABLE` (нет в расписании) / `409 SLOT_ALREADY_BOOKED`. Конец слота сервер берёт из своего расписания |
| `GET` | `/api/health` | → `{ ok: true, version }` |

---

## 4. Подпланы

| № | План | Результат | Зависит от | Трек | Срок | Статус |
|---|---|---|---|---|---|---|
| 01 | [Фундамент и «серая» башня](plan/01-foundation.md) | Сайт со скроллом по 6 этажам-заглушкам, камера-лифт, стриминг, уровни качества, тесты, бюджеты в CI | — | A | 1,5 нед. | **детальный** |
| 02 | [3D-фабрика и эталонный этаж](plan/02-3d-factory.md) | Blender-конвейер одной командой, роботы, запекание, этаж «Диспетчерская» в финальном качестве на сайте | 01 (задачи 1, 9–11) | B + Claude | 1,5–2 нед. | **детальный** |
| 03 | [Этажи и механики](plan/03-floors-and-mechanics.md) | Остальные 5 уровней, капсулы, хотспоты, рычаг, конвейер, табло, слайдер, команда | 01, 02 | A + B | 3 нед. | **детальный** |
| 04 | Контент, кейсы, i18n, SEO | Тексты, страницы кейсов, словари RU/EN, мета, sitemap, юр. страницы | 01 (задача 8) | C | параллельно | цели и файлы ниже |
| 05 | Живые функции (API) | Агент, заявки → CRM + Telegram, бронирование, калькулятор, острова | 01 | C | 3 нед. | цели и файлы ниже |
| 06 | Полировка и запуск | Постеры и OG, звук, доступность, производительность, аналитика, деплой | 03, 04, 05 | все | 1,5 нед. | цели и файлы ниже |
| 07 | [Редизайн](plan/07-redesign.md): лифт, этажи, люди, интерактив; [этап 0 — баги](plan/07a-fixes.md) | Уровень «Awwwards»: 3D-лифт, игрушечные люди, сюжет на каждом этаже, новый HTML-слой | 01–06 | все | 5–6 нед. | **согласован**, этап 0 выполнен |

### Треки (команда из трёх человек)

- **Трек A — «движок»:** план 01 → механики плана 03 → производительность в плане 06.
- **Трек B — «3D-фабрика» (разработчик + Claude):** план 02 → арт этажей плана 03 → постеры в плане 06. Нужен Blender 4.5 LTS на машине этого разработчика.
- **Трек C — «контент и бэкенд»:** фаза 0 (сбор материалов) → план 04 → план 05 → деплой в плане 06.

### Дорожная карта

| Неделя | Трек A | Трек B | Трек C |
|---|---|---|---|
| 1 | План 01, задачи 1–8 | План 02, задачи 1–7 (Python и Blender не зависят от сайта) | Фаза 0, план 04: модель контента |
| 2 | План 01, задачи 9–14 + **ворота 01** | План 02, задачи 8–13 + **ворота 02** | План 05: каркас API, заявки, слоты |
| 3–5 | План 03: капсулы, хотспоты, механики | План 03: арт пяти уровней | План 05: агент, бронь, острова; план 04: тексты, кейсы |
| 6 | Интеграция, план 06: производительность | План 06: постеры, OG | План 06: аналитика, деплой на стенд |
| 7 | План 06: устройства, доступность | Правки арта по прогону | Запуск |

Итого около 7 недель плюс 1–2 недели запаса — в рамках брифа (7–9 недель).

---

## 5. Планы 03–06: цели, файлы, критерии готовности

Детальные пошаговые версии (`docs/plan/03-…06-…md`) пишутся после ворот плана 02 по тому же шаблону, что планы 01 и 02.

### План 03 — Этажи и механики

**Цель:** все шесть уровней в финальном качестве, на каждом работает один главный интерактив, сквозной сюжет капсулы.

| Задача | Файлы | Готово, когда |
|---|---|---|
| Хотспоты: луч по `hit__*`, подсветка, DOM-кнопки-двойники, короткая вибрация на Android (`navigator.vibrate(10)`) | `src/engine/interaction/hotspots.ts`, `.test.ts` | Тап/клик и Enter на DOM-кнопке дают одно и то же `hotspot:activated` |
| Модуль анимаций `tween(from, to, durationMs, ease, onUpdate)` на часах цикла рендера (рычаги, кнопки, полёты капсул) | `src/engine/tween.ts`, `.test.ts` | Детерминированные тесты на фейковых часах; без GSAP |
| Капсулы: пул `InstancedMesh` (≤ 64), полёт по трубе из `tower.json` и якорям | `src/engine/capsules/*` | 1 draw call на все капсулы; личная капсула едет вместе с лифтом |
| Выбор боли на крыше + метки «Это про вас» | `src/ui/pain-picker.ts`, `src/engine/relevance.ts` (`relevantLevels(pain)`, тесты) | Выбор сохраняется на сессию (sessionStorage в try/catch), метки на нужных этажах |
| Крыша: антенны, дождь сообщений (инстансы, анимация в шейдере), счётчик, рычаг «Включить агента» | `art/blender/levels/roof.py`, `src/engine/levels/roof.ts` | «До/после» за 5 секунд, 60 FPS на эталонных телефонах |
| Цех CRM: конвейер (UV-скролл), штампы, картотека, кнопка «Запустить сделку» с этапами в HTML | `art/blender/levels/crm.py`, `src/engine/levels/crm.ts` | Капсула проходит 5 этапов, счётчик «сэкономлено часов» |
| Календарный зал: табло split-flap (инстансы + атлас глифов из Canvas2D) | `art/blender/levels/booking.py`, `src/engine/levels/booking.ts` | `booking:confirmed` перелистывает табло на выбранное время |
| Мастерская: стапель, слайдер «Макет → код → продакшн» (dissolve-шейдер), скролл кода на мониторе | `art/blender/levels/workshop.py`, `src/engine/levels/workshop.ts` | Три состояния переключаются без прозрачности (alpha test) |
| Подвал: три человека по `art/team.json`, пульт, док капсулы | `art/blender/kit/person.py`, `art/blender/levels/basement.py` | Персонажи узнаваемы командой; капсула приземляется на пульт |
| Фоновая жизнь: LED, моргание, троттлинг 30 FPS в простое, политика reduced motion | `src/engine/ambient.ts` | e2e: draw calls ≤ 60 на каждом этаже, 0 анимаций при reduced motion |

### План 04 — Контент, кейсы, i18n, SEO

**Цель:** все тексты RU/EN, кейсы как отдельные страницы, поисковая видимость, юридические страницы.

| Задача | Файлы | Готово, когда |
|---|---|---|
| Коллекция кейсов (MDX на язык, схема zod: услуга, отрасль, город, метрики, стек, NDA, порядок) | `src/content.config.ts`, `src/content/cases/{ru,en}/*.mdx` | Сборка падает на кейсе без обязательных полей |
| Карточки кейсов в секциях этажей (фильтр по услуге) + страницы `/cases/<slug>` и `/en/cases/<slug>` | `src/components/CaseCard.astro`, `src/pages/cases/[slug].astro`, `src/pages/en/cases/[slug].astro` | Назад со страницы кейса возвращает на тот же этаж (bfcache + якорь) |
| Словари: полнота RU/EN (тест на совпадение ключей), переключатель языка, `hreflang`, canonical | `src/i18n/*` | Тест ключей зелёный, у каждой страницы есть пара |
| SEO: мета, schema.org (Organization, Service, CreativeWork), sitemap, robots.txt | `src/components/Seo.astro`, `astro.config.mjs` (`@astrojs/sitemap`) | Валидатор schema.org без ошибок |
| Тексты: этажи, команда, процесс (4 шага), FAQ; перевод EN | `src/i18n/ru.ts`, `src/i18n/en.ts` | Команда утвердила RU, EN вычитан |
| Политика конфиденциальности, согласие на обработку ПД (закон РК; 152-ФЗ, если есть клиенты из РФ) | `src/pages/privacy.astro`, `src/pages/en/privacy.astro` | Ссылка на согласие есть у каждой формы |
| Шрифты: акцидентный гротеск для заголовков (Unbounded или Tektur), Manrope или Onest для текста, JetBrains Mono для подписей. Свой хостинг, subset кириллица + латиница, woff2, `font-display: swap`, preload только заголовочного | `public/fonts/*`, `src/styles/fonts.css` | Шрифты ≤ 60 КБ на первый экран, CLS не растёт (метрики fallback-шрифта подобраны) |

### План 05 — Живые функции (API и острова)

**Цель:** сайт сам является работающим кейсом: настоящий агент, заявки в CRM, бронирование, калькулятор. События отражаются в 3D.

| Задача | Файлы | Готово, когда |
|---|---|---|
| Каркас API: Hono, конфиг из env (zod), health, request-id, логи без ПД | `api/src/app.ts`, `api/src/server.ts` (`@hono/node-server`), `api/src/config.ts` | Тесты через `app.request()` без сети |
| Хранилище и лимиты: `node:sqlite` (заявки, сессии, журнал расходов), лимиты на IP и сессию | `api/src/db.ts`, `api/src/limits.ts` | Лимит срабатывает в тесте; БД бэкапится одним файлом |
| Заявки: валидация, honeypot + время заполнения, обязательное согласие → БД → Telegram команде → CRM-адаптер → автоответ | `api/src/routes/lead.ts`, `api/src/integrations/{telegram,crm}.ts` | Заявка за ≤ 2 с в CRM и Telegram; спам-тесты отбиваются |
| Слоты: чистая функция `generateSlots(rules, busy, now, tz)` + адаптер календаря; бронь с перепроверкой | `api/src/booking/*`, `api/src/routes/{slots,book}.ts` | Тесты: часовые пояса, рабочие часы, минимальное упреждение, гонка за слот → 409 |
| Агент: SSE, ручной цикл стриминга с инструментами `get_free_slots`, `book_call`, `create_lead`, `show_case`; база знаний в system prompt с кэшем | `api/src/agent/*`, `api/src/routes/chat.ts` | Тесты на фейковом клиенте: вызовы инструментов, обрыв по бюджету, отказ модели, формат SSE |
| Сценарный режим чата (без LLM): деревья ответов RU/EN | `api/src/agent/scripted.ts`, `src/data/chat-scripts.ts` | При исчерпании бюджета чат продолжает работать |
| Продолжение в Telegram (`t.me/<бот>?start=<токен ≤ 64 симв.>`) и WhatsApp (`wa.me/<номер>?text=`) | `api/src/routes/telegram.ts`, `src/lib/deeplinks.ts` | Бот получает контекст разговора по токену |
| Острова Preact: `ChatSheet`, `Calculator`, `BookingWidget`, `LeadForm`; состояние — `@preact/signals`; события — в шину | `src/islands/*` | Острова грузятся лениво, не попадают в стартовый бандл |
| Калькулятор: `estimate(selection, priceTable)` → вилка сроков и цены | `src/lib/estimate.ts`, `src/data/pricing.ts` | Тесты на граничные комбинации; таблица цен заполнена студией |

**Агент (параметры, сверены с документацией Claude API на 2026-10):**
- SDK `@anthropic-ai/sdk`, ручной цикл `client.beta.messages.stream(...)` + `finalMessage()`.
- Модель `claude-opus-5-5` (env `AGENT_MODEL`), `output_config: { effort: "low" }` — для чат-маршрута этого достаточно.
- Серверный фолбэк при отказе: `betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`.
- System prompt (база знаний) с `cache_control: { type: "ephemeral", ttl: "1h" }`.
- Инструменты с `strict: true` и `eager_input_streaming: true`; вход каждого инструмента перепроверяется zod. `tool_choice` только `auto` (принудительный выбор инструмента на этой модели даёт 400).
- Проверка `stop_reason`: `refusal` → вежливый ответ и сценарный режим; `max_tokens` при `tool_use` → не выполнять инструмент.
- Цены для бюджета: $4 / $20 за 1 млн токенов (вход / выход), чтение кэша — $0,20. Месячный потолок задаётся в env (`AGENT_MONTHLY_BUDGET_USD`); при превышении включается сценарный режим.
- Переключение на `claude-haiku-5-5` ($0,10 / $0,50) — решение студии, это одна переменная окружения.

### План 06 — Полировка и запуск

| Задача | Файлы | Готово, когда |
|---|---|---|
| Постеры и OG: Playwright в режиме `?shot=` → AVIF (sharp) на этаж и форм-фактор | `scripts/posters.ts`, `public/posters/*` | Постер и живая сцена совпадают (переход без «скачка») |
| Режим Static: постеры этажей + лёгкие CSS-анимации, Save-Data | `src/components/StaticLevel.astro` | Lighthouse ≥ 90, всё содержимое доступно |
| Звук: WebAudio, спрайт ≤ 300 КБ, выключен по умолчанию, грузится по кнопке | `src/ui/sound.ts` | Не грузится, пока не включён |
| Доступность: axe в Playwright (`@axe-core/playwright`), клавиатура (PageUp/PageDown — соседний этаж), видимый фокус | `tests/e2e/a11y.spec.ts`, `src/ui/keyboard.ts` | 0 нарушений уровня serious/critical; вся башня проходится с клавиатуры |
| Производительность: прогон матрицы устройств, профиль памяти iPhone, Lighthouse CI | `docs/qa/device-matrix.md` | Все бюджеты брифа 3.8 выполнены |
| Аналитика: Яндекс Метрика + Umami, воронка из шины событий | `src/ui/analytics.ts` | Воронка видна в отчёте |
| Деплой: Docker (сборка Astro → Caddy + Node API), `docker-compose.yml`, HTTPS, кэш-заголовки, бэкап SQLite | `Dockerfile`, `docker-compose.yml`, `deploy/Caddyfile` | Сайт открывается из РК и РФ (проверить через знакомых или удалённый браузер) |
| Мониторинг: аптайм, ошибки браузера → `/api/log` (с лимитом), алерты расходов агента в Telegram | `api/src/routes/log.ts` | Тестовая ошибка доходит до Telegram |
| Запуск и витрины: Awwwards / CSSDA / FWA, форум three.js, Codrops | — | Заявки поданы |

---

## 6. Definition of Done (для любой задачи)

- Сначала тест, потом код. Тест падал до реализации и проходит после.
- `pnpm verify` зелёный: lint, типы, юнит-тесты, сборка, бюджеты, e2e. Для 3D-фабрики плюс `pnpm art:test`.
- Нет новых зависимостей, не указанных в плане. Если без них никак — план правится в том же коммите с обоснованием.
- Никаких секретов в репозитории; `.env.example` обновлён, если добавлена переменная.
- Коммит в формате Conventional Commits на английском (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).

## 7. Ворота качества

| Ворота | Когда | Критерий |
|---|---|---|
| **Ворота 01** | конец плана 01 | «Серая» башня: правильный уровень качества на всех устройствах матрицы, 60 FPS на эталонных телефонах, нет вылетов после трёх проходов по башне, Lighthouse ≥ 90 |
| **Ворота 02** | конец плана 02 | Эталонный этаж: сверка Blender ↔ сайт в допуске, бюджеты этажа выполнены, команда утвердила стиль. Иначе — запасной путь из брифа 3.12 |
| **Ворота 06** | перед запуском | Все бюджеты брифа 3.8, a11y без серьёзных нарушений, заявка и бронь проходят от сайта до CRM и Telegram |

## 8. Решения фазы 0 (нужны от команды до недели 2)

| Решение | Нужно для | Срок |
|---|---|---|
| Название, логотип, домен | Шапка, мета, деплой | неделя 2 |
| Важны ли клиенты из РФ | Хостинг (VPS в РК по умолчанию) и юр. тексты | неделя 2 |
| CRM для своих заявок (amoCRM или Bitrix24), календарь | План 05 | неделя 3 |
| Существующий Telegram-бот студии или новый | План 05 | неделя 3 |
| Ключ Anthropic API (или другой LLM-стек) и месячный бюджет на агента | План 05 | неделя 3 |
| Вилки цен и сроков по услугам | Калькулятор | неделя 4 |
| 6–9 кейсов по шаблону + разрешения на логотипы | План 04 | неделя 4 |
| Описание внешности троих для персонажей (причёска, очки, борода, цвет одежды) | План 03, подвал | неделя 4 |
