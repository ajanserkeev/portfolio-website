# План 07c — Этап 2: труппа персонажей

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Для других инструментов:** задачи строго по порядку; тест → падает → код → проходит → коммит. Задачи 2, 3 и 6 требуют Blender 4.5 LTS.

**Goal:** Игрушечные люди с настоящими лицами и скелетной анимацией живут в башне: общий файл `src/assets/cast.glb`, движок расставляет их по якорям этажей и проигрывает клипы; в подвале основатели заменяют людей с лицами-экранами (B3).

**Architecture:** Исходники — CC0-набор Kenney «Mini Characters» в `art/vendor/`. 3D-фабрика собирает из них `cast.glb`: один скинированный меш на персонажа (1 draw call), общая текстура-палитра, один набор клипов на все скелеты (кости у всех одинаковые). Этаж ставит людей пустыми узлами `anchor__cast__<слот>` с `extras.character` и `extras.clip`. Движок грузит труппу один раз, клонирует персонажа (`SkeletonUtils.clone`), даёт ему matcap-материал как у роботов и `AnimationMixer`.

**Tech Stack:** Blender 4.5 LTS · Python 3.12 + pytest · Three.js 0.186.1 (`AnimationMixer`, `three/addons/utils/SkeletonUtils.js`) · gltf-transform 4.5.1 + meshoptimizer · Vitest · Playwright

**Spec:** `docs/plan/07-redesign.md` — разделы 3.2 (люди и роботы), 4 (вариант B), 5 (архитектура), 6 (этап 2).

---

## Итоги спайка (2026-10-12)

Картинки: `docs/qa/spike-cast-2026-10-12/`.

| Критерий спайка | Требование | Результат |
|---|---|---|
| Лицензия | CC0 | ✅ Kenney Mini Characters 1.0, CC0 (`License.txt` в архиве) |
| Треугольники на персонажа | ≤ 3 000 | ✅ 710–873 |
| Файл труппы | ≤ 350 КБ | ✅ 4 персонажа + 6 клипов = 100 КБ после meshopt (≈ 22 КБ на персонажа, клипы 12 КБ на всех) |
| Draw calls | 1 на персонажа | ✅ тело и голова склеены в один скинированный меш |
| Анимации | ходьба, сидение, работа, жесты | ✅ `idle`, `walk`, `sit`, `interact-right`, `emote-yes/no`, `pick-up`, `wheelchair-*`; не хватает «печатает» и «машет» — дописываются скриптом (скелет из 7 костей) |
| Вид в нашем мире | одобрение команды | ⏳ на согласовании |

**Найденные подводные камни (уже с решениями):**
1. Импортёр glTF в Blender добавляет лишний меш `Icosphere` — удалять всё, что не привязано к скелету.
2. Рост персонажей 0,61–0,79 м (причёски и шапки разные); масштаб ×1,7 → 1,0–1,35 м (роботы ~1,4 м с антенной). Сначала брал ×1,45 по одному персонажу — низкие вышли 0,89 м. Мерить по вершинам с учётом скелета, не по `bound_box`.
3. У второго и следующих импортов действия получают суффиксы `.001`… — брать клипы только с первого скелета.
4. GLTFLoader делает имена узлов уникальными (`leg-left_1`…), из-за чего общие клипы не цепляются к остальным персонажам. После загрузки вернуть костям исходные имена (`/_\d+$/` → ``): клипы ищут кости внутри своего клона.
5. Текстура-палитра 512×512 в WebP — 1,9 КБ; лица нарисованы в ней, поэтому оставляем текстуру (`MeshMatcapMaterial({ matcap, map })`), а не переводим в цвет вершин.

## Global Constraints

- Бюджеты: JS движка ≤ 200 КБ gzip (сейчас 170,9), `cast.glb` ≤ 350 КБ (новый, вписать в контракт), draw calls ≤ 60, треугольники в кадре ≤ 120 000.
- Имена узлов без `.`, `:`, `/`, `[`, `]` и пробелов; разделитель `__`.
- Слов в 3D нет. `src/assets/*` меняются только командами `pnpm art:*`.
- Источники CC0 лежат в репозитории с их `License.txt`; в `docs/` — строка благодарности Kenney.
- При `prefers-reduced-motion` персонажи стоят в позе первого кадра своего клипа (без цикла).

## Review Focus

- **Этаж выгружен стримером:** миксеры его персонажей останавливаются и освобождаются, общие геометрии и текстура труппы — нет. Тест в задаче 5.
- **`cast.glb` не загрузился** (сеть, 404): этажи работают без людей, без ошибок в консоли. Тест в задаче 5.
- **Неизвестный персонаж или клип в якоре этажа:** сборка фабрики падает (контракт), а не сайт. Тест в задаче 4.
- **Reduced motion / простой:** миксеры не крутят цикл рендера, когда фоновая жизнь выключена. Тест в задаче 5.
- **Бюджет draw calls** с людьми на двух этажах в кадре ≤ 60. Тест в задаче 6.

---

### Task 1: Исходники и спецификация труппы

**Files:**
- Create: `art/vendor/kenney-mini-characters/` (12 GLB персонажей, `Textures/colormap.png`, `License.txt`), `art/cast.json`, `art/blender/towerlib/core/cast.py`, `art/tests/test_cast.py`

**Interfaces:**
- Produces: `art/cast.json` — `{ "scale": 1.7, "clips": [...], "characters": [{ "id": "founder-lead", "source": "character-male-c", "role": "founder" }, …] }`; `towerlib.core.cast.load_cast(path) -> CastSpec` с проверками: уникальные `id` (regex `^[a-z0-9-]+$`), файл источника существует, клипы из набора исходника или из `CUSTOM_CLIPS = ("type", "wave")`.

- [x] Тесты pytest: валидная спецификация читается; повтор `id`, неизвестный источник, неизвестный клип, `id` с точкой → `ValueError` с понятным текстом. → FAIL → реализация → PASS. Commit: `feat(art): vendor Kenney Mini Characters and describe the cast`.

### Task 2: Сборка `cast.raw.glb` в Blender

**Files:**
- Create: `art/blender/build_cast.py`, `art/blender/towerlib/cast_rig.py` (bpy), `art/tests/blender/test_cast_rig.py`

Шаги скрипта (выверены спайком): импорт каждого источника → удалить меши вне скелета → склеить тело и голову → удалить второй UV → переименовать в `cast__<id>` / `cast__<id>__mesh` → масштаб → снять анимации со всех скелетов, кроме первого → дописать клипы `type` (руки вперёд, кисти поочерёдно вверх-вниз, 0,4 с, цикл) и `wave` (правая рука вверх и покачивание, 1,2 с) ключами по 7 костям → оставить только клипы из `cast.json` как NLA-дорожки первого скелета → экспорт GLB (`export_animation_mode="NLA_TRACKS"`, без тангенсов, текстура WebP).

- [x] Тесты в Blender: после сборки на сцене N скелетов `cast__*`, у каждого ровно один меш-ребёнок; рост каждого 1,05–1,25 м; клипы `type` и `wave` существуют и двигают кости `arm-left`/`arm-right`; в файле нет `Icosphere`. → FAIL → реализация → PASS. Commit: `feat(art): build the character cast in Blender with custom typing and waving clips`.

### Task 3: Команда `pnpm art:cast` и контракт файла труппы

**Files:**
- Create: `art/scripts/cast.ts`, `art/scripts/cast-contract.ts`, `art/scripts/cast-contract.test.ts`
- Modify: `package.json` (`art:cast`), `art/scripts/built-levels.test.ts` (проверка готового `src/assets/cast.glb`), `docs/02-implementation-plan.md` (новый раздел контракта 3.2.1 «Файл труппы»). Бюджет `cast.glb` проверяют `pnpm art:cast` и `built-levels.test.ts` (в `check-budgets.ts` не нужен: тот меряет JS)
- Output: `src/assets/cast.glb`

**Interfaces:**
- Produces: `checkCastDocument(doc): { errors: string[]; characters: string[]; clips: string[]; maxTriangles: number }` — каждый `cast__<id>` (без `__mesh`) имеет ровно один скинированный меш, ≤ 3 000 треугольников, клипы — непустой набор, имена по regex контракта.

- [x] Тесты Vitest на синтетических документах (gltf-transform `Document`): верный; персонаж без скина; лишний меш; превышение треугольников. → FAIL → PASS. Сборка, оптимизация (`dedup → prune → weld → quantize → meshopt`), проверка контракта и бюджета. Commit: `feat(art): pnpm art:cast exports and checks src/assets/cast.glb`.

### Task 4: Якоря людей на этажах

**Files:**
- Create: `art/blender/towerlib/kit/cast_slot.py`, `src/engine/cast/casting.ts`, `src/engine/cast/casting.test.ts`
- Modify: `art/scripts/level-contract.ts` (+ тест), `docs/02-implementation-plan.md` (контракт 3.2: `anchor__cast__<slot>` с `extras.character`, `extras.clip`, `extras.speed?`)

**Interfaces:**
- Produces (Python): `cast_slot(name, at, yaw_deg, character, clip)` → пустой узел `anchor__cast__<name>` с extras.
- Produces (TS): `castPlacements(anchors: ReadonlyMap<string, Object3D>): CastPlacement[]`, `CastPlacement = { slot; character; clip; position: Vector3; yaw: number; speed: number }` — чистая функция по якорям с префиксом `cast__`.
- Контракт уровня проверяет: персонаж и клип якоря существуют в `art/cast.json`.

- [x] Тесты: `castPlacements` берёт только `cast__*`, читает extras, значения по умолчанию (`clip: 'idle'`, `speed: 1`); контракт уровня отклоняет неизвестного персонажа/клип. → FAIL → PASS. Commit: `feat(engine): place cast members from level anchors`.

### Task 5: Труппа в движке

**Files:**
- Create: `src/engine/cast/cast-library.ts`, `src/engine/cast/actor.ts`, `src/engine/cast/actor.test.ts`
- Modify: `src/engine/assets.ts` (`castUrl`), `src/engine/glb-source.ts` (спаун и освобождение людей этажа), `src/engine/app.ts` (ленивая загрузка труппы, `__tower.actors`), `scripts/check-budgets.ts` (замер)

**Interfaces:**
- Produces: `loadCastLibrary(url, matcap): Promise<CastLibrary | null>` (`null` при ошибке, без исключений); `CastLibrary.spawn(character): Object3D | null`; `createActor(root, clips, { clip, speed, motion }): Actor` с `update(dt)`, `play(clip, fadeSec?)`, `dispose()`.
- Имена костей нормализуются при загрузке (подводный камень 4).

- [x] Тесты: `actor.test.ts` на синтетическом скелете (Bone + AnimationClip из `NumberKeyframeTrack`/`QuaternionKeyframeTrack`): `update` двигает кость; при `motion.ambient === false` поза — первый кадр и `update` ничего не меняет; `dispose` останавливает миксер и снимает кэш (`mixer.uncacheRoot`).
- [x] e2e: с подменой `cast.glb` на 404 — этаж живой, ошибок нет, `__tower.actors === 0` (`tests/e2e/cast.spec.ts`). Проверка «в подвале ≥ 3 человека, draw calls ≤ 60» — в задаче 6, когда появятся якоря. Логика «людей этажа» вынесена в `src/engine/cast/level-people.ts` (+ тест), чтобы `glb-source.ts` не разрастался.
- [x] Бюджет JS движка ≤ 200 КБ (`pnpm budgets`). Commit: `feat(engine): load the cast once and animate people on every floor`.

### Task 6: Основатели в подвале (B3)

> **По факту реализации.** Основатели сидят *за* длинным пультом лицом к камере: мониторы на столе закрыли бы лица, поэтому на столе только клавиатуры, а экраны (код, график, канбан) висят на задней стене. Стул и клавиатура — новый модуль кита `towerlib/kit/office.py` (`props.py` уже 446 строк); якорь сидящего — на высоте сиденья минус 5 см (`SEATED_ANCHOR_Y`), потому что поза `sit`/`type` у Kenney опускает таз почти к полу. Нашёлся баг стен: внутренняя грань задней стены на `z = −2,8`, и экраны на `−2,85…−2,9` прятались в ней (канбан CRM не был виден никогда) — добавлен `shell.back_wall_z(ctx)` и тест. Док капсулы сдвинут вправо, чтобы труба не закрывала основателя. Старый «кивок» по клику на человека (`view-<id>`) удалён вместе с людьми-экранами; реакции на тап для всех персонажей — этап 3.

**Files:**
- Modify: `art/cast.json` (три основателя — после ответа студии о составе и внешности; до него — по `art/team.json`), `art/blender/levels/basement.py` (стулья, `cast_slot` × 3 с клипом `type`), `src/engine/levels/basement.ts` (при прилёте капсулы основатели встают и машут: `play('wave')`)
- Delete: `art/blender/towerlib/kit/person.py` и его тесты (люди с лицами-экранами), `art/team.json` (данные переезжают в `art/cast.json`)
- Output: `src/assets/levels/basement.*`

- [x] Тест контроллера: событие `lead:submitted` → у всех основателей клип `wave`, через 3 с — обратно `type`. → FAIL → PASS. `pnpm art:build basement`, скриншот, `pnpm verify`. Commit: `feat(levels): seat the founders in the basement as real people`.

### Task 7: Документация и благодарность

- [x] `docs/plan/07-redesign.md` — статус этапа 2; `docs/01-brief.md` — пункт «три члена команды» отмечен; `README` или `docs/credits.md` — «Персонажи: Kenney Mini Characters (CC0), kenney.nl». Commit: `docs: credit Kenney and record stage 2`.
