# План 07e — Этап 4: стилевой кадр «Диспетчерская» + здание

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Для других инструментов:** задачи строго по порядку; тест → падает → код → проходит → коммит. Задачи 2–5 требуют Blender 4.5 LTS. **Задача 6 — ворота: дальше этап 5 только после того, как команда утвердит картинку.**

**Goal:** Башня читается как здание, а этаж 4 «Диспетчерская» — как готовый образец качества для остальных этажей: кирпичный фасад-рама, латунный карниз и заклёпки на торцах перекрытий, свой тон этажа (бирюзовые обои, деревянная панель, ковролин), крупный герой-объект (телефон на стене), роботы ×1,3, свет от экранов и настольных ламп, без повторяющегося «наполнителя».

**Architecture:** Всё — 3D-фабрика (`art/blender`), цвет в вершинах + запечённый лайтмап, без новых текстур. Раскладка кирпича — чистая функция в `towerlib/core/bricks.py` (pytest): одна связная сетка на стену (один остров лайтмапа), кирпич и шов — это цвет граней. Фасад и тон этажа — модули `kit/facade.py` и `kit/decor.py`; `props.py` (уже ~450 строк) не растёт.

**Tech Stack:** Blender 4.5 LTS · Python 3.12 + pytest · Three.js 0.186.1 · Playwright (скриншоты и видео для ворот)

**Spec:** `docs/plan/07-redesign.md` — разделы 3.1 (башня как здание, таблица тонов), 3.2 (роботы), 6 (этап 4).

## Решения

| Вопрос | Решение | Почему |
|---|---|---|
| Кирпич | Сетка граней с цветом в вершинах: ряды со сдвигом в полкирпича, шов — узкие ряды и столбцы; «игрушечный» кирпич 0,5 × 0,2 м, шов 3 см | Без текстур и без тысяч отдельных коробок: ≈ 3 тыс. треугольников на стену, один остров лайтмапа |
| Где кирпич | Внешние грани боковых стен и их торцы | Изнутри стены — тон этажа; кирпич читается как «рама» вокруг разреза |
| Тон этажа | Панель обоев перед задней и боковыми стенами (вертикальные полосы), снизу деревянная панель с латунным поручнем, ковролин с каймой | Тон меняется параметрами этажа, без новых материалов |
| Роботы ×1,3 | `RobotSpec.scale` — масштаб корневого узла `dyn__<id>` | Движок двигает корень по Y, масштаб наследуют все части; контракт 3.2 не меняется |
| Свет | Экраны (уже светятся) + настольные лампы (`area_lamp` + светящийся абажур `glow`), без потолочных ламп | Таблица 3.1: «экраны + настольные лампы» |

## Global Constraints

- Бюджеты этажа: ≤ 60 000 треугольников, GLB ≤ 450 КБ, лайтмап ≤ 250 КБ; draw calls ≤ 60.
- Шахта лифта свободна (тест `test_shaft_clearance.py`), кирпич и карниз — часть оболочки (`shell-…`), им можно касаться шахты.
- Слов в 3D нет. Имена узлов — по контракту 3.2.

---

### Task 1: Раскладка кирпича

**Files:** Create `art/blender/towerlib/core/bricks.py`, `art/tests/test_bricks.py`; Modify `art/palette.json` (`brick`, `brick-dark`, `mortar`, `wallpaper-teal`, `wallpaper-teal-dark`, `carpet`, `carpet-border`).

**Interfaces:** `brick_grid(width, height, *, brick=(0.36, 0.15), mortar=0.025) -> BrickGrid` с `xs`, `ys` (границы ячеек) и `cell(col, row) -> int | None` (номер кирпича или `None` для шва); соседние ряды сдвинуты на полкирпича; `shade(brick_id) -> int` — детерминированный вариант цвета 0…2.

- [x] Тесты: сетка покрывает ровно `width × height`; ряд шва между рядами кирпича; в соседних рядах вертикальные швы не совпадают; номер кирпича одинаков по всей его длине; `shade` детерминирован. → FAIL → PASS → commit `feat(art): brick layout for the tower facade`.

### Task 2: Фасад-рама

**Files:** Create `art/blender/towerlib/kit/facade.py`; Modify `art/blender/towerlib/kit/shell.py` (вызов фасада для этажей), `art/tests/blender/test_facade.py`.

Кирпич на внешних гранях и торцах боковых стен; латунный карниз (`shell-cornice`) вдоль переднего торца перекрытия; заклёпки на торце перекрытия через 0,6 м.

- [x] Blender-тесты: у стены есть грани цвета шва и кирпича; треугольников кирпича на стену ≤ 4 000; карниз на переднем торце перекрытия; заклёпки не выступают в шахту. `pnpm art:test`. Commit `feat(art): brick facade, brass cornice and riveted slab edges`.

### Task 3: Тон этажа

**Files:** Create `art/blender/towerlib/kit/decor.py` (`wallpaper(ctx, tone)`, `wainscot(ctx, tone)`, `carpet(ctx, tone)`, `desk_lamp(ctx, name, at)`); `art/tests/blender/test_decor.py`.

- [x] Blender-тесты: обои перед задней стеной и не дальше её внутренней грани; ковролин на полу от стены до стены (`shell-carpet` — часть оболочки, как перекрытие: кабина лифта стоит на нём); настольная лампа даёт свет (`area`) и светящийся абажур (`glow`). Commit `feat(art): floor tone kit — wallpaper, wainscot, carpet and desk lamps`.

### Task 4: Роботы ×1,3

**Files:** Modify `art/blender/towerlib/kit/robot.py` (`RobotSpec.scale`), `art/tests/blender/test_robot.py`.

- [x] Тест: робот с `scale=1.3` выше на 30 % и стоит на полу (низ на `y ≈ hover`). Commit `feat(art): scalable robots`.

### Task 5: «Диспетчерская»

**Files:** Modify `art/blender/levels/agents.py`; rebuild `src/assets/levels/*` (оболочка общая — пересобираются все этажи).

Состав: бирюзовые обои / ковролин; телефон-герой крупнее и по центру задней стены; три оператора за столами с настольными лампами, роботы ×1,3; сортировщик справа; убрать стойку сервера, кофе-стойку, фикусы и три потолочные лампы.

- [ ] `pnpm art:build` всех этажей, `pnpm art:test`, бюджеты этажей, `pnpm verify`. Commit `feat(art): the dispatch room style frame`.

### Task 6: Ворота — показать команде

- [ ] Blender-превью (`pnpm art:preview agents`), скриншоты сайта (телефон и десктоп), видео 15 с (Playwright: проезд к этажу, тап по роботу, открытие чата) → `docs/qa/style-frame-<дата>/`. Постеры `pnpm posters`. Commit `docs: style frame for approval`. **Стоп до одобрения.**
