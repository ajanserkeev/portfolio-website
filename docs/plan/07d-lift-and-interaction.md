# План 07d — Этап 3: лифт в 3D и механика интерактива

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Для других инструментов:** задачи строго по порядку; тест → падает → код → проходит → коммит. Задача 4 требует Blender 4.5 LTS (пересборка трёх этажей).

**Goal:** Лифт становится частью мира — латунная шахта в переднем левом углу башни, кабина едет вместе с камерой и открывает двери на этаже, над дверью стрелочный указатель. Интерактив обнаруживается сам: над главным объектом этажа висит подсказка, люди и роботы отвечают на тап. `app.ts` разбит до ≤ 250 строк.

**Architecture:** Шахта, кабина и двери — процедурная геометрия three.js (скруглённые коробки и цилиндры, цвет в вершинах, общий matcap-материал, как у роботов): это динамика, её не нужно запекать, и она одна на всю башню. Логика дверей и прибытия — чистые функции с тестами. Подсказки — HTML (тексты в i18n), движок сообщает экранные координаты через шину. Реакции на тап — луч по людям и роботам текущего этажа.

**Tech Stack:** Three.js 0.186.1 (`RoundedBoxGeometry`, `mergeGeometries` из `three/addons`) · TypeScript · Vitest · Playwright · Blender 4.5 LTS

**Spec:** `docs/plan/07-redesign.md` — разделы 3.3, 3.4, 5, 6 (этап 3).

## Решения (отличия от спецификации)

| Спецификация | Решение | Почему |
|---|---|---|
| Шахта «слева от этажей» | В переднем левом углу **внутри** башни: x ∈ [−5,8; −4,6], z ∈ [1,6; 2,8] | Снаружи шахта не влезает в портретный кадр телефона без переделки кадрирования (`framing.ts` и его копия на Python). Внутри перекрытия естественно скрывают кабину между этажами, как в настоящем здании; мешают только три фикуса — их сдвигаем |
| `shaft.glb` из фабрики | Процедурная геометрия в движке | Одна шахта на всю башню, без запекания (matcap, как роботы), меньше файлов и поводов для рассинхрона; размеры — из `scene/tower.json` |
| Пульсирующее кольцо-спрайт в 3D | Пульсирующая точка в HTML-подсказке | Одна механика вместо двух; спрайт добавил бы draw call на этаж |
| Подсветка объекта при наведении | Только курсор-указатель (уже есть) | Главные объекты запечены в общий меш `static`, подсветить их по отдельности нельзя без смены контракта; подсказка решает ту же задачу |

## Global Constraints

- Бюджеты: JS движка ≤ 200 КБ gzip (сейчас 175,3), draw calls ≤ 60, треугольники ≤ 120 000.
- Слов в 3D нет: на указателе только стрелка. Тексты подсказок — в `src/i18n`.
- Шина — единственная связь движка и HTML (контракт 3.4); новые события вписываются в контракт и мастер-план.
- `prefers-reduced-motion`: двери и стрелка переключаются без анимации, подсказки не пульсируют.
- Изменение `scene/tower.json` → `pnpm fixtures:camera` и `pnpm art:test:py` в том же коммите.

## Review Focus

- **Лифт едет транзитом через этаж** (быстрый скролл): двери не открываются, «дзынь» звучит только по прибытии. Тест в задаче 2.
- **Режим Static и `?shot=`:** шахта и кабина не мешают постерам (кабина стоит на этаже кадра с открытыми дверями), подсказок нет. Тест в задаче 4 и 5.
- **Подсказка за краем экрана или под карточкой текста:** скрыта, а не висит в воздухе. Тест в задаче 5.
- **Тап по человеку во время его реакции:** реакция не накапливается, после неё — исходный клип. Тест в задаче 6.
- **Draw calls** на любом этаже с лифтом и людьми ≤ 60. Тест в задаче 4.

---

### Task 1: Разделить `app.ts`

**Files:** Create `src/engine/debug-handle.ts`, `src/engine/tower-wiring.ts`; Modify `src/engine/app.ts`.

- `debug-handle.ts`: `installDebugHandle(state: DebugState): () => void` — всё про `window.__tower` и HUD.
- `tower-wiring.ts`: `wireTowerEvents(deps): () => void` — подписки на шину (капсулы по `capsule:selected`/`deal:run`/`chat:user-message`, окно взаимодействия по `hotspot:activated`), возвращает отписку.
- [x] Поведение не меняется: существующие e2e (`engine`, `floor-actions`, `cast`, `shot`) — защита. `app.ts` ≤ 250 строк. `pnpm verify`. Commit: `refactor(engine): split debug handle and event wiring out of app.ts`.

### Task 2: Прибытие лифта

**Files:** Create `src/engine/elevator/arrival.ts`, `.test.ts`; Modify `src/engine/events.ts` (`{ type: 'lift:arrived'; level: LevelId }`), `docs/02-implementation-plan.md` (3.4), `src/engine/app.ts`, `src/ui/sound.ts` (звонок — на `lift:arrived`, а не на каждый пройденный этаж).

**Interfaces:** `createArrivalTracker(): { update(position: number, settled: boolean): number | null }` — возвращает индекс этажа один раз, когда лифт *остановился* на целом этаже (|position − round| < 0,01 и `settled`); транзит не считается; повторный вызов на том же этаже без отъезда — `null`.

- [x] Тесты: остановка на 2 → `2` один раз; проезд через 1, 2, 3 без остановки → `null`; отъезд и возврат на тот же этаж → снова `2`. → FAIL → PASS → commit `feat(engine): announce when the lift stops at a floor`.

### Task 3: Двери и стрелка

**Files:** Create `src/engine/elevator/doors.ts`, `.test.ts`.

**Interfaces:** `createDoors({ openSeconds = 0.6, instant = false }): { open(): void; close(): void; update(dt): number /* 0 закрыто … 1 открыто */ }` с плавностью `easeInOutQuad`; `dialAngle(position, total)` переиспользует `needleAngleDeg` из `src/ui/elevator.ts`.

*При реализации:* у дверей есть ещё флаг `moving` (цикл рендера крутится, пока створки едут); отдельная `dialAngle` не понадобилась — `elevator.ts` (задача 4) зовёт `needleAngleDeg` напрямую.

- [x] Тесты: открытие за 0,6 с; закрытие с середины начинается с текущего значения; `instant` — сразу 0/1. → FAIL → PASS → commit `feat(engine): door and dial logic for the lift cabin`.

### Task 4: Шахта и кабина

**Files:** Create `src/engine/elevator/elevator-model.ts` (геометрия), `src/engine/elevator/elevator.ts` (склейка: позиция кабины = `levelBaseY(position)`, двери, стрелка); Modify `scene/tower.json` (`"shaft": { "x": -5.2, "z": 2.2, "width": 1.15, "depth": 1.15 }`), `src/engine/config.ts` (+ тест схемы), `scene/camera-fixtures.json`, `src/engine/app.ts`, `art/blender/levels/{agents,booking,workshop}.py` (фикусы из угла шахты), `art/blender/levels/*` — общий тест: ни один предмет этажа не заходит в объём шахты, `docs/02-implementation-plan.md` (3.1 — `shaft`).

Модель: четыре латунные стойки на всю высоту башни, рамы-кольца на уровне каждого перекрытия, «машинное отделение» над крышей; кабина — пол, потолок с лампой (glow), задняя и боковые стенки цвета чернил, две латунные створки спереди; над проёмом — кремовый циферблат с чернильной стрелкой. Всё — `mergeGeometries` с цветом в вершинах: шахта 1 draw call, кабина 1, створки 1 (`InstancedMesh` × 2), стрелка 1.

- [ ] Тесты: `elevatorModel(cfg)` — bounding box шахты в заданном объёме и по высоте от пола подвала до крыши + 2,8 м; кабина целиком внутри шахты. Blender-тест: `assert_clear_of_shaft(level)` для всех шести этажей. e2e: `?tier=lite&debug=1` на этажах 0, 3, 5 — draw calls ≤ 60; `__tower.lift` (`{ doors, cabinY }`) — двери открыты после остановки.
- [ ] `pnpm art:build agents booking workshop`, `pnpm fixtures:camera`, `pnpm verify`. Commit: `feat(engine): a brass lift shaft with a cabin that rides with the camera`.

### Task 5: Подсказки над объектами

**Files:** Create `src/engine/hints.ts` (проекция центра хитбокса главного действия текущего этажа → `{ level, action, x, y, visible }` раз в кадр, только при изменении), `src/ui/pins.ts`, `.test.ts`; Modify `src/engine/events.ts` (`{ type: 'hint:moved'; level; action; x; y; visible }`), `src/components/TowerPage.astro` (контейнер `[data-pins]`), `src/i18n/*` (`hints.<action>` — «Потяните рычаг» и т. п.), `src/styles/global.css`.

Поведение: чип с пульсирующей точкой над объектом; виден, только когда лифт стоит, объект в кадре и не под карточкой текста (`elementFromPoint` в центре чипа — не `.level__content`), пока посетитель ни разу не активировал это действие за сессию (`sessionStorage` в `try/catch`). Клик по чипу = `hotspot:activated`. Для скринридеров чип скрыт (`aria-hidden`, `tabindex=-1`): доступный двойник — кнопка в тексте этажа.

- [ ] Тесты `pins.test.ts` (фейковый DOM): позиция из события, скрытие по `visible:false`, по сессии, по перекрытию карточкой. e2e: на `#crm` в 3D подсказка видна и клик по ней запускает сделку; в Static подсказок нет. Commit: `feat(ui): hint chips over each floor's main object`.

### Task 6: Реакции на тап

**Files:** Create `src/engine/interaction/reactions.ts`, `.test.ts`; Modify `src/engine/cast/actor.ts` (`react(clip, seconds)`), `src/engine/actors/robot.ts` (`react()`: подпрыгнуть и улыбнуться на 1,2 с; на пятый тап подряд — лицо `annoyed`, пасхалка из брифа), `src/engine/interaction/hotspots.ts` (луч по людям и роботам, если не попал в хитбокс), `src/engine/events.ts` (`{ type: 'actor:tapped'; level; actor }`).

- [ ] Тесты: человек — `wave` на 2 с, затем исходный клип; повторный тап во время реакции продлевает, а не наслаивает; робот — счётчик тапов сбрасывается через 4 с, на 5-й — `annoyed`. e2e: тап по основателю в подвале → `actor:tapped` (через `__tower.lastTap`). Commit: `feat(engine): people wave and robots react when tapped`.

### Task 7: Визуальный прогон и документация

- [ ] Скриншоты всех этажей (телефон, десктоп) с лифтом; постеры `pnpm posters`; `docs/plan/07-redesign.md` — статус этапа 3. Commit: `docs: record stage 3`.
