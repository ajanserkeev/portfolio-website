# План 02 — «3D-фабрика» и эталонный этаж

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Для других инструментов:** задачи строго по порядку; тест → падает → код → проходит → коммит. Задачи 3–9 запускают Blender из терминала, поэтому нужен инструмент с доступом к командной строке (Claude Code, Cursor Agent и т. п.).

**Goal:** Одна команда `pnpm art:build <этаж>` собирает этаж башни из Python-кода. Blender в фоновом режиме строит геометрию из кита деталей, ставит роботов, запекает свет, экспортирует GLB и лайтмап, сжимает их и проверяет контракт. Сайт подхватывает файлы вместо «серой коробки». Результат — этаж «Диспетчерская» в финальном качестве.

**Architecture:** Чистый Python (`towerlib/core`) — координаты, палитра, UV, имена, камера — тестируется pytest без Blender. Код на `bpy` (`towerlib/kit`, `bake`, `rig`, `export`) тестируется маленьким раннером внутри Blender. Node-скрипты (`art/scripts`) запускают Blender, собирают атласы экранов и лиц, сжимают GLB через gltf-transform и проверяют контракт. В браузере собственный шейдер `albedo × lightmap × headroom` для статики и matcap для роботов.

**Tech Stack:** Blender 4.5 LTS (Python 3.11 внутри) · Python 3.12 + pytest 9.1.1 · @gltf-transform/core|functions|extensions 4.5.1 · meshoptimizer 1.3.0 · sharp 0.35.5 · Playwright 1.64.0 · three 0.186.1

**Spec:** `docs/01-brief.md` (разделы 3.6, 3.8, 3.12), `docs/02-implementation-plan.md` (контракты 3.1–3.3)

## Global Constraints

- **Blender 4.5 LTS**, не 5.x: Python API 4.x стабилен, его хорошо знают AI-инструменты, поддержка до 2027. Проверка — `pnpm art:doctor`.
- **Имена узлов GLB** — только по контракту 3.2, разделитель `__`. Точки, двоеточия, слэши, скобки и пробелы запрещены (GLTFLoader их вырезает).
- **Координаты в коде уровней** — как в three.js (метры, Y вверх, фронт +Z). В Blender переводит только `to_blender()`.
- **Бюджет на этаж:** ≤ 60 000 треугольников, GLB ≤ 450 КБ, лайтмап ≤ 250 КБ. Сборка падает при превышении.
- **Лайтмап:** 1024×1024, `headroom = 2.0`. Хранит `irradiance × exposure / headroom` в sRGB.
- **Слов в 3D нет**, экраны в атласе — языконезависимые макеты (полоски, пузыри, графики).
- **Готовые файлы** (`src/assets/levels/*`, `src/assets/textures/*`, манифесты атласов) коммитятся — остальной команде Blender не нужен.
- **Python:** `from __future__ import annotations`, без внешних пакетов внутри Blender (только `bpy`, `bmesh`, `mathutils`, `numpy`). TypeScript — правила плана 01.

## Review Focus

1. **Пробелы в путях** (`C:\Users\Aman Zhanserkeev\Portfolio Website`) — Blender и скрипты работают без экранирования. Аргументы передаются массивом, без shell. Тест: `blenderArgs` в задаче 1, сборка в задаче 9 запускается прямо в этом репозитории.
2. **Повторная сборка этажа** даёт байт-в-байт тот же GLB: фиксированный seed, детерминированная развёртка. Проверка — задача 9, шаг с двойной сборкой и сравнением хешей.
3. **Blender не установлен или не той версии** — понятное сообщение с командой установки, а не трейсбек. Тест — задача 1.
4. **Раздутый результат** (например, лайтмап 4096) — сборка падает на бюджете, а не уезжает в репозиторий. Тест — задача 8.
5. **На сайте нет файлов этажа** (ещё не собран, 404) — вместо падения показывается «серая коробка». Тест — задача 10.

---

## Структура файлов этого плана

| Файл | Ответственность |
|---|---|
| `art/palette.json` | Палитра (sRGB hex) — единый источник цвета |
| `art/blender/towerlib/core/coords.py` | three.js ↔ Blender, поворот локальных смещений |
| `art/blender/towerlib/core/palette.py` | hex → линейный RGB |
| `art/blender/towerlib/core/paths.py` | Скругление углов траекторий труб |
| `art/blender/towerlib/core/uv.py` | Прямоугольники атласов → UV Blender |
| `art/blender/towerlib/core/naming.py` | Имена узлов по контракту |
| `art/blender/towerlib/core/spec.py` | Загрузка tower.json, палитры, манифестов в `BuildContext` |
| `art/blender/towerlib/core/camera.py` | Копия математики камеры сайта (для превью) |
| `art/blender/towerlib/core/glb.py` | Чтение JSON-части GLB (для тестов) |
| `art/blender/towerlib/core/args.py` | Аргументы после `--` в командной строке Blender |
| `art/blender/towerlib/kit/scene.py` | Сброс сцены, коллекции-роли, склейка |
| `art/blender/towerlib/kit/materials.py` | Материалы для запекания |
| `art/blender/towerlib/kit/primitives.py` | Скруглённые коробки, цилиндры, капсулы, сферы, трубы, экраны |
| `art/blender/towerlib/kit/anchors.py` | Якоря и хитбоксы |
| `art/blender/towerlib/kit/shell.py` | Пол, стены, потолок-окклюдер, вертикальная труба башни |
| `art/blender/towerlib/kit/props.py` | Мебель и машины |
| `art/blender/towerlib/kit/robot.py` | Параметрический робот |
| `art/blender/towerlib/rig.py` | Свет: солнце, небо, лампы |
| `art/blender/towerlib/bake.py` | Развёртка, запекание, денойз, кодирование лайтмапа |
| `art/blender/towerlib/export.py` | Подготовка и экспорт GLB |
| `art/blender/levels/test_room.py`, `agents.py` | Сцены этажей |
| `art/blender/build_level.py`, `render_preview.py`, `render_matcap.py`, `doctor.py` | Точки входа Blender |
| `art/screens/*.html`, `art/screens/screen.css` | Исходники экранов |
| `art/scripts/*.ts` | Node: запуск Blender, атласы, сжатие, контракт, сборка, сверка |
| `art/tests/*.py`, `art/tests/blender/*.py` | pytest и тесты внутри Blender |
| `src/engine/actors/faces.ts`, `robot-pose.ts`, `robot.ts` | Лица и анимация роботов |
| `src/engine/materials/baked.ts`, `shared.ts` | Материалы рантайма |
| `src/engine/glb-level.ts`, `glb-source.ts`, `assets.ts` | Загрузка этажей из GLB |

---

### Task 1: Blender 4.5 LTS и проверка окружения

**Files:**
- Create: `art/scripts/blender.ts`, `art/scripts/doctor.ts`, `art/blender/doctor.py`
- Modify: `package.json` (скрипт `art:doctor`)
- Test: `art/scripts/blender.test.ts`

**Interfaces:**
- Produces: `REQUIRED_BLENDER = '4.5'`, `BLENDER_MISSING_MESSAGE`, `interface FindOptions`, `blenderCandidates(o)`, `findBlender(o): string | null`, `defaultFindOptions()`, `blenderArgs(args): string[]`, `runBlender(bin, args, cwd?): Promise<void>`, `requireBlender(): string`.

- [x] **Step 1: Установить Blender 4.5 LTS (с подтверждением пользователя)**

```bash
winget install --id BlenderFoundation.Blender.LTS.4.5 -e --accept-package-agreements --accept-source-agreements
```
Expected: Blender в `C:\Program Files\Blender Foundation\Blender 4.5\blender.exe`. На macOS/Linux — установщик с blender.org и переменная `BLENDER_BIN` с путём к бинарнику.

- [x] **Step 2: Написать падающий тест**

`art/scripts/blender.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { BLENDER_MISSING_MESSAGE, blenderArgs, type FindOptions, findBlender } from './blender';

function options(overrides: Partial<FindOptions>): FindOptions {
  return { env: {}, platform: 'win32', exists: () => false, listDir: () => [], ...overrides };
}

describe('findBlender', () => {
  it('prefers BLENDER_BIN', () => {
    const bin = 'D:\\Tools\\Blender\\blender.exe';
    expect(findBlender(options({ env: { BLENDER_BIN: bin }, exists: (p) => p === bin }))).toBe(bin);
  });

  it('finds Blender 4.5 under Program Files and ignores other versions', () => {
    const found = findBlender(
      options({
        env: { ProgramFiles: 'C:\\Program Files' },
        listDir: () => ['Blender 5.2', 'Blender 4.5'],
        exists: (p) => p.endsWith('blender.exe'),
      }),
    );
    expect(found).toBe('C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe');
  });

  it('returns null when Blender is missing', () => {
    expect(findBlender(options({}))).toBeNull();
  });
});

describe('blenderArgs', () => {
  it('runs headless, with factory settings, failing on Python errors', () => {
    expect(blenderArgs(['--python', 'a b/x.py'])).toEqual([
      '--background',
      '--factory-startup',
      '--python-exit-code',
      '1',
      '--python',
      'a b/x.py',
    ]);
  });
});

it('tells the user how to install Blender', () => {
  expect(BLENDER_MISSING_MESSAGE).toContain('winget install --id BlenderFoundation.Blender.LTS.4.5');
  expect(BLENDER_MISSING_MESSAGE).toContain('BLENDER_BIN');
});
```

- [x] **Step 3: Запустить и убедиться, что падает**

Run: `pnpm vitest run art/scripts/blender.test.ts`
Expected: FAIL — модуля `./blender` нет.

- [x] **Step 4: Реализация**

`art/scripts/blender.ts`:
```ts
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { posix, win32 } from 'node:path';

export const REQUIRED_BLENDER = '4.5';

export const BLENDER_MISSING_MESSAGE = [
  `Blender ${REQUIRED_BLENDER} LTS was not found.`,
  'Windows: winget install --id BlenderFoundation.Blender.LTS.4.5 -e',
  'Or set BLENDER_BIN to the full path of the blender executable.',
].join('\n');

export interface FindOptions {
  env: Record<string, string | undefined>;
  platform: NodeJS.Platform;
  exists: (path: string) => boolean;
  listDir: (path: string) => string[];
}

export function blenderCandidates(o: FindOptions): string[] {
  const candidates: string[] = [];
  if (o.env.BLENDER_BIN) candidates.push(o.env.BLENDER_BIN);
  if (o.platform === 'win32') {
    const base = win32.join(o.env.ProgramFiles ?? 'C:\\Program Files', 'Blender Foundation');
    let dirs: string[] = [];
    try {
      dirs = o.listDir(base);
    } catch {
      dirs = [];
    }
    for (const dir of dirs.filter((d) => d.includes(REQUIRED_BLENDER)).sort().reverse()) {
      candidates.push(win32.join(base, dir, 'blender.exe'));
    }
  } else if (o.platform === 'darwin') {
    candidates.push('/Applications/Blender.app/Contents/MacOS/Blender');
  } else {
    candidates.push(posix.join('/usr', 'bin', 'blender'), '/snap/bin/blender');
  }
  return candidates;
}

export function findBlender(o: FindOptions): string | null {
  return blenderCandidates(o).find((path) => o.exists(path)) ?? null;
}

export function defaultFindOptions(): FindOptions {
  return {
    env: process.env,
    platform: process.platform,
    exists: existsSync,
    listDir: (path) => readdirSync(path),
  };
}

export function blenderArgs(args: readonly string[]): string[] {
  return ['--background', '--factory-startup', '--python-exit-code', '1', ...args];
}

/** Runs Blender without a shell: paths with spaces need no quoting. */
export function runBlender(bin: string, args: readonly string[], cwd = process.cwd()): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, blenderArgs(args), { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Blender exited with code ${code}`)),
    );
  });
}

export function requireBlender(): string {
  const bin = findBlender(defaultFindOptions());
  if (!bin) {
    console.error(BLENDER_MISSING_MESSAGE);
    process.exit(1);
  }
  return bin;
}
```

`art/blender/doctor.py`:
```python
"""Prints the Blender environment and checks the glTF exporter options the pipeline relies on."""
from __future__ import annotations

import sys

import bpy

REQUIRED_EXPORT_OPTIONS = [
    "export_format",
    "export_yup",
    "export_extras",
    "export_apply",
    "export_texcoords",
    "export_normals",
    "export_materials",
    "export_vertex_color",
    "export_active_vertex_color_when_no_material",
    "export_cameras",
    "export_lights",
    "export_animations",
]

print("Blender", bpy.app.version_string)
print("Python", sys.version.split()[0])
if tuple(bpy.app.version[:2]) != (4, 5):
    print("WARNING: the pipeline is pinned to Blender 4.5 LTS")
available = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
missing = [name for name in REQUIRED_EXPORT_OPTIONS if name not in available]
if missing:
    print("MISSING glTF exporter options:", ", ".join(missing))
    raise SystemExit(1)
print("glTF exporter OK")
```

`art/scripts/doctor.ts`:
```ts
import { requireBlender, runBlender } from './blender.ts';

await runBlender(requireBlender(), ['--python', 'art/blender/doctor.py']);
```

`package.json`:
```json
"art:doctor": "tsx art/scripts/doctor.ts"
```

- [x] **Step 5: Запустить тест и доктор**

Run: `pnpm vitest run art/scripts/blender.test.ts`
Expected: PASS.

Run: `pnpm art:doctor`
Expected: `Blender 4.5.x`, `Python 3.11.x`, `glTF exporter OK`. Если опция экспортёра отсутствует — сверить имена с документацией 4.5, поправить `REQUIRED_EXPORT_OPTIONS` и вызов экспорта в задаче 8 (в одном коммите).

- [x] **Step 6: Commit**

```bash
git add art/scripts/blender.ts art/scripts/blender.test.ts art/scripts/doctor.ts art/blender/doctor.py package.json
git commit -m "feat(art): locate Blender 4.5 LTS and check the glTF exporter"
```

---

### Task 2: Чистое ядро на Python (без Blender) и pytest

**Files:**
- Create: `art/palette.json`, `art/requirements-dev.txt`, `art/scripts/py.ts`
- Create: `art/blender/towerlib/__init__.py`, `art/blender/towerlib/core/__init__.py`, `core/coords.py`, `core/palette.py`, `core/paths.py`, `core/uv.py`, `core/naming.py`, `core/spec.py`, `core/camera.py`, `core/glb.py`, `core/args.py`
- Modify: `package.json` (`art:test:py`)
- Test: `art/tests/conftest.py`, `art/tests/test_coords.py`, `test_palette.py`, `test_paths.py`, `test_uv.py`, `test_naming.py`, `test_spec.py`, `test_camera.py`, `test_glb.py`, `test_args.py`

**Interfaces:**
- Produces (Python): `Vec3`, `to_blender(v)`, `to_three(v)`, `place(local, at, yaw_deg)`; `srgb_to_linear(c)`, `hex_to_linear(hex)`, `Palette[name] -> (r, g, b)`; `round_corners(points, radius, segments=6)`; `UvRect(x, y, width, height, image_width, image_height).corners_blender()`, `face_cell_rect(index, cols, rows, cell)`; `NODE_NAME`, `dyn(id, part=None)`, `anchor(*parts)`, `hit(name)`, `is_valid(name)`; `LevelDims`, `ScreenInfo`, `FacesInfo`, `BuildContext`, `load_context(art_dir)`; `apparent_width`, `framing_distance`, `camera_pose(lift, width, height, tower)`; `read_glb_json(path)`; `script_args(argv)`.

- [ ] **Step 1: Палитра и окружение pytest**

`art/palette.json`:
```json
{
  "sand": "#F3EBDD",
  "sand-dark": "#E4D6BF",
  "ink": "#1C1B22",
  "signal": "#FF5A1F",
  "teal": "#1FA59A",
  "mustard": "#F2B33D",
  "brass": "#C9A15B",
  "steel": "#9AA3AD",
  "wood": "#B98A5E",
  "plant": "#5E9E6E",
  "slab": "#6E6258",
  "robot": "#F6F1E7",
  "robot-dark": "#3A3F4A",
  "white": "#FBF8F2",
  "whatsapp": "#25D366",
  "telegram": "#2AABEE",
  "instagram": "#E1306C"
}
```

`art/requirements-dev.txt`:
```text
pytest==9.1.1
```

`art/scripts/py.ts`:
```ts
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const VENV = join('art', '.venv');
const python =
  process.platform === 'win32' ? join(VENV, 'Scripts', 'python.exe') : join(VENV, 'bin', 'python');

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(python)) {
  run(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', VENV]);
  run(python, ['-m', 'pip', 'install', '-r', join('art', 'requirements-dev.txt')]);
}
run(python, process.argv.slice(2));
```

`package.json`:
```json
"art:test:py": "tsx art/scripts/py.ts -m pytest art/tests -q"
```

`art/tests/conftest.py`:
```python
import sys
from pathlib import Path

ART = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ART / "blender"))
```

`art/blender/towerlib/__init__.py`:
```python
"""Tower level factory. core/ is pure Python; everything else needs Blender's bpy."""
```

`art/blender/towerlib/core/__init__.py`:
```python
"""Pure-Python helpers, importable without Blender."""
```

- [ ] **Step 2: Написать падающие тесты**

`art/tests/test_coords.py`:
```python
from towerlib.core.coords import place, to_blender, to_three


def test_three_to_blender_and_back():
    assert to_blender((1.0, 2.0, 3.0)) == (1.0, -3.0, 2.0)
    assert to_three(to_blender((1.0, 2.0, 3.0))) == (1.0, 2.0, 3.0)


def test_place_without_rotation_just_offsets():
    assert place((1.0, 0.5, 0.0), (2.0, 0.0, 1.0), 0.0) == (3.0, 0.5, 1.0)


def test_place_rotates_around_the_vertical_axis():
    x, y, z = place((1.0, 0.0, 0.0), (0.0, 0.0, 0.0), 90.0)
    assert abs(x) < 1e-9 and y == 0.0 and abs(z + 1.0) < 1e-9
```

`art/tests/test_palette.py`:
```python
import json
from pathlib import Path

import pytest

from towerlib.core.palette import Palette, hex_to_linear, srgb_to_linear

ART = Path(__file__).resolve().parents[1]


def test_srgb_to_linear_known_values():
    assert srgb_to_linear(0.0) == 0.0
    assert abs(srgb_to_linear(1.0) - 1.0) < 1e-12
    assert abs(srgb_to_linear(0.5) - 0.21404114) < 1e-6


def test_hex_to_linear_parses_with_and_without_hash():
    assert hex_to_linear("#FFFFFF") == hex_to_linear("ffffff")
    assert hex_to_linear("#000000") == (0.0, 0.0, 0.0)


def test_bad_hex_is_rejected():
    with pytest.raises(ValueError):
        hex_to_linear("#12345")
    with pytest.raises(ValueError):
        hex_to_linear("#GG0000")


def test_palette_reports_unknown_names():
    palette = Palette({"sand": "#F3EBDD"})
    assert palette["sand"][0] > 0.8
    with pytest.raises(KeyError, match="unknown palette color 'nope'"):
        palette["nope"]


def test_project_palette_loads():
    colors = json.loads((ART / "palette.json").read_text(encoding="utf-8"))
    palette = Palette(colors)
    for name in ("sand", "ink", "slab", "robot", "robot-dark", "teal", "mustard", "signal"):
        assert len(palette[name]) == 3
```

`art/tests/test_paths.py`:
```python
import math

from towerlib.core.paths import round_corners


def _length(points):
    return sum(math.dist(a, b) for a, b in zip(points, points[1:]))


def test_straight_lines_are_unchanged():
    line = [(0.0, 0.0, 0.0), (1.0, 0.0, 0.0), (2.0, 0.0, 0.0)]
    assert round_corners(line, 0.3) == line


def test_corner_is_replaced_by_an_arc():
    path = [(0.0, 0.0, 0.0), (0.0, 2.0, 0.0), (2.0, 2.0, 0.0)]
    rounded = round_corners(path, 0.5, segments=6)
    assert rounded[0] == path[0] and rounded[-1] == path[-1]
    assert (0.0, 2.0, 0.0) not in rounded
    assert len(rounded) == 2 + 7
    assert _length(rounded) < _length(path)


def test_radius_is_limited_by_short_segments():
    path = [(0.0, 0.0, 0.0), (0.0, 0.2, 0.0), (2.0, 0.2, 0.0)]
    rounded = round_corners(path, 5.0, segments=4)
    assert all(p[1] >= -1e-9 for p in rounded)
```

`art/tests/test_uv.py`:
```python
from towerlib.core.uv import UvRect, face_cell_rect


def test_top_left_rect_maps_to_the_top_of_blender_uv_space():
    rect = UvRect(x=0, y=0, width=512, height=256, image_width=1024, image_height=1024)
    assert rect.corners_blender() == [(0.0, 0.75), (0.5, 0.75), (0.5, 1.0), (0.0, 1.0)]


def test_full_image():
    rect = UvRect(0, 0, 100, 100, 100, 100)
    assert rect.corners_blender() == [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)]


def test_face_cells_walk_rows_left_to_right():
    assert face_cell_rect(0, 4, 2, 128) == UvRect(0, 0, 128, 128, 512, 256)
    assert face_cell_rect(5, 4, 2, 128) == UvRect(128, 128, 128, 128, 512, 256)
```

`art/tests/test_naming.py`:
```python
import pytest

from towerlib.core.naming import anchor, dyn, hit, is_valid


@pytest.mark.parametrize(
    "name",
    ["static", "screens", "glow", "dyn__op-1", "dyn__op-1__arm-l", "anchor__capsule-in", "anchor__a__b", "hit__phone"],
)
def test_contract_names_are_valid(name):
    assert is_valid(name)


@pytest.mark.parametrize(
    "name",
    ["dyn.op-1", "Static", "hit__a b", "anchor__", "dyn__op__arm__x", "screen-phone", "level.agents"],
)
def test_other_names_are_rejected(name):
    assert not is_valid(name)


def test_helpers_build_valid_names():
    assert dyn("op-1") == "dyn__op-1"
    assert dyn("op-1", "head") == "dyn__op-1__head"
    assert anchor("capsule", "in") == "anchor__capsule__in"
    assert hit("phone") == "hit__phone"


def test_helpers_reject_bad_ids():
    with pytest.raises(ValueError):
        dyn("Op 1")
    with pytest.raises(ValueError):
        hit("a.b")
```

`art/tests/test_spec.py`:
```python
import json

from towerlib.core.spec import load_context


def _write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


def test_load_context_reads_all_sources(tmp_path):
    art = tmp_path / "art"
    _write(tmp_path / "scene" / "tower.json", {"level": {"width": 12, "depth": 6, "height": 4, "slab": 0.4}, "camera": {}, "tube": {"x": 5.3, "z": 1.6, "radius": 0.2}})
    _write(art / "palette.json", {"sand": "#F3EBDD"})
    _write(art / "screens" / "manifest.json", {"width": 2048, "height": 1024, "screens": {"code": {"x": 8, "y": 8, "width": 512, "height": 640, "glow": "#202530"}}})
    _write(art / "faces" / "manifest.json", {"cols": 4, "rows": 2, "cell": 128, "frames": ["neutral", "happy"]})
    ctx = load_context(art)
    assert ctx.dims.width == 12 and ctx.dims.slab == 0.4
    assert ctx.screens["code"].rect.image_height == 1024
    assert ctx.faces.cols == 4 and ctx.faces.frames[1] == "happy"
    assert ctx.palette["sand"][0] > 0.8
```

`art/tests/test_camera.py`:
```python
import json
from pathlib import Path

from towerlib.core.camera import apparent_width, camera_pose

ROOT = Path(__file__).resolve().parents[2]


def test_apparent_width():
    assert abs(apparent_width(12, 6, 0) - 12) < 1e-9
    assert abs(apparent_width(12, 6, 90) - 6) < 1e-9


def test_matches_the_site_camera_fixtures():
    tower = json.loads((ROOT / "scene" / "tower.json").read_text(encoding="utf-8"))
    fixtures = json.loads((ROOT / "scene" / "camera-fixtures.json").read_text(encoding="utf-8"))
    for case in fixtures["cases"]:
        position, target = camera_pose(case["lift"], case["viewport"]["width"], case["viewport"]["height"], tower)
        for got, want in zip(position + target, case["position"] + case["target"]):
            assert abs(got - want) < 1e-6, (case, position, target)
```

`art/tests/test_glb.py`:
```python
import json
import struct

from towerlib.core.glb import read_glb_json


def test_reads_the_json_chunk(tmp_path):
    payload = json.dumps({"asset": {"version": "2.0"}, "nodes": [{"name": "static"}]}).encode()
    payload += b" " * ((4 - len(payload) % 4) % 4)
    data = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(payload)) + struct.pack("<I4s", len(payload), b"JSON") + payload
    path = tmp_path / "x.glb"
    path.write_bytes(data)
    assert read_glb_json(path)["nodes"][0]["name"] == "static"
```

`art/tests/test_args.py`:
```python
from towerlib.core.args import script_args


def test_returns_arguments_after_the_double_dash():
    assert script_args(["blender", "-b", "-P", "x.py", "--", "--level", "agents"]) == ["--level", "agents"]


def test_returns_empty_list_without_double_dash():
    assert script_args(["blender", "-b"]) == []
```

- [ ] **Step 3: Запустить и убедиться, что падают**

Run: `pnpm art:test:py`
Expected: первый запуск создаёт `art/.venv` и ставит pytest, затем FAIL — `ModuleNotFoundError: towerlib.core.coords` и т. д.

- [ ] **Step 4: Реализация**

`art/blender/towerlib/core/coords.py`:
```python
"""three.js / glTF coordinates (Y up, front = +Z) and their Blender counterparts (Z up)."""
from __future__ import annotations

import math

Vec3 = tuple[float, float, float]


def to_blender(v: Vec3) -> Vec3:
    """three.js (x, y, z) -> Blender (x, -z, y): the inverse of the glTF exporter's +Y-up conversion."""
    x, y, z = v
    return (x, -z, y)


def to_three(v: Vec3) -> Vec3:
    x, y, z = v
    return (x, z, -y)


def place(local: Vec3, at: Vec3, yaw_deg: float) -> Vec3:
    """Rotates a local offset around the vertical axis by yaw_deg and adds it to `at` (three.js coords)."""
    yaw = math.radians(yaw_deg)
    lx, ly, lz = local
    x = lx * math.cos(yaw) + lz * math.sin(yaw)
    z = -lx * math.sin(yaw) + lz * math.cos(yaw)
    return (at[0] + x, at[1] + ly, at[2] + z)
```

`art/blender/towerlib/core/palette.py`:
```python
from __future__ import annotations

_HEX = set("0123456789abcdefABCDEF")


def srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_linear(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.lstrip("#")
    if len(value) != 6 or any(ch not in _HEX for ch in value):
        raise ValueError(f"bad color {hex_color!r}, expected #RRGGBB")
    r, g, b = (int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b))


class Palette:
    """Named colors from art/palette.json, as linear RGB for Blender color attributes."""

    def __init__(self, colors: dict[str, str]):
        self._colors = {name: hex_to_linear(value) for name, value in colors.items()}

    def __getitem__(self, name: str) -> tuple[float, float, float]:
        try:
            return self._colors[name]
        except KeyError:
            raise KeyError(f"unknown palette color {name!r}") from None

    def names(self) -> list[str]:
        return sorted(self._colors)
```

`art/blender/towerlib/core/paths.py`:
```python
"""Rounded polylines for pneumatic tubes: sharp corners make self-intersecting tube meshes."""
from __future__ import annotations

import math

from .coords import Vec3


def _sub(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _along(origin: Vec3, direction: Vec3, distance: float) -> Vec3:
    length = math.sqrt(sum(c * c for c in direction))
    return tuple(o + d / length * distance for o, d in zip(origin, direction))  # type: ignore[return-value]


def _collinear(a: Vec3, b: Vec3) -> bool:
    cross = (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
    return math.sqrt(sum(c * c for c in cross)) < 1e-9


def _bezier(p0: Vec3, p1: Vec3, p2: Vec3, t: float) -> Vec3:
    u = 1.0 - t
    return tuple(u * u * a + 2 * u * t * b + t * t * c for a, b, c in zip(p0, p1, p2))  # type: ignore[return-value]


def round_corners(points: list[Vec3], radius: float, segments: int = 6) -> list[Vec3]:
    """Replaces every interior corner with a quadratic arc of up to `radius` (limited by segment lengths)."""
    if len(points) < 3 or radius <= 0:
        return list(points)
    result: list[Vec3] = [points[0]]
    for a, b, c in zip(points, points[1:], points[2:]):
        incoming, outgoing = _sub(b, a), _sub(c, b)
        r = min(radius, math.dist(a, b) / 2, math.dist(b, c) / 2)
        if r <= 1e-9 or _collinear(incoming, outgoing):
            result.append(b)
            continue
        start = _along(b, _sub(a, b), r)
        end = _along(b, outgoing, r)
        result.extend(_bezier(start, b, end, i / segments) for i in range(segments + 1))
    result.append(points[-1])
    return result
```

`art/blender/towerlib/core/uv.py`:
```python
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class UvRect:
    """Rectangle in image space: x, y from the top-left corner, in pixels."""

    x: float
    y: float
    width: float
    height: float
    image_width: float
    image_height: float

    def corners_blender(self) -> list[tuple[float, float]]:
        """Bottom-left, bottom-right, top-right, top-left in Blender UV space (v up).

        The glTF exporter flips v, so the web sees image-space rows: load atlases with flipY = false.
        """
        u0 = self.x / self.image_width
        u1 = (self.x + self.width) / self.image_width
        v_top = 1.0 - self.y / self.image_height
        v_bottom = 1.0 - (self.y + self.height) / self.image_height
        return [(u0, v_bottom), (u1, v_bottom), (u1, v_top), (u0, v_top)]


def face_cell_rect(index: int, cols: int, rows: int, cell: int) -> UvRect:
    return UvRect(
        x=(index % cols) * cell,
        y=(index // cols) * cell,
        width=cell,
        height=cell,
        image_width=cols * cell,
        image_height=rows * cell,
    )
```

`art/blender/towerlib/core/naming.py`:
```python
"""Node names from the level contract. '__' separates parts: GLTFLoader strips '.', ':', '/', '[', ']'."""
from __future__ import annotations

import re

NODE_NAME = re.compile(
    r"^(static|screens|glow|dyn__[a-z0-9-]+(__[a-z0-9-]+)?|anchor__[a-z0-9-]+(__[a-z0-9-]+)*|hit__[a-z0-9-]+)$"
)
_ID = re.compile(r"^[a-z0-9-]+$")


def _check(part: str) -> str:
    if not _ID.match(part):
        raise ValueError(f"bad id {part!r}: use a-z, 0-9 and '-'")
    return part


def dyn(id_: str, part: str | None = None) -> str:
    name = f"dyn__{_check(id_)}"
    return f"{name}__{_check(part)}" if part else name


def anchor(*parts: str) -> str:
    return "anchor__" + "__".join(_check(p) for p in parts)


def hit(name: str) -> str:
    return f"hit__{_check(name)}"


def is_valid(name: str) -> bool:
    return bool(NODE_NAME.match(name))
```

`art/blender/towerlib/core/spec.py`:
```python
"""Everything a level script needs, loaded from the repository's config files."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .palette import Palette, hex_to_linear
from .uv import UvRect


@dataclass(frozen=True)
class LevelDims:
    width: float
    depth: float
    height: float
    slab: float


@dataclass(frozen=True)
class ScreenInfo:
    rect: UvRect
    glow: tuple[float, float, float]


@dataclass(frozen=True)
class FacesInfo:
    cols: int
    rows: int
    cell: int
    frames: tuple[str, ...]


@dataclass(frozen=True)
class BuildContext:
    tower: dict
    dims: LevelDims
    palette: Palette
    screens: dict[str, ScreenInfo]
    faces: FacesInfo


def _json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_context(art_dir: Path) -> BuildContext:
    tower = _json(art_dir.parent / "scene" / "tower.json")
    level = tower["level"]
    screens_raw = _json(art_dir / "screens" / "manifest.json")
    faces_raw = _json(art_dir / "faces" / "manifest.json")
    screens = {
        name: ScreenInfo(
            rect=UvRect(s["x"], s["y"], s["width"], s["height"], screens_raw["width"], screens_raw["height"]),
            glow=hex_to_linear(s["glow"]),
        )
        for name, s in screens_raw["screens"].items()
    }
    return BuildContext(
        tower=tower,
        dims=LevelDims(level["width"], level["depth"], level["height"], level["slab"]),
        palette=Palette(_json(art_dir / "palette.json")),
        screens=screens,
        faces=FacesInfo(faces_raw["cols"], faces_raw["rows"], faces_raw["cell"], tuple(faces_raw["frames"])),
    )
```

`art/blender/towerlib/core/camera.py`:
```python
"""Python copy of src/engine/framing.ts + camera-path.ts. Kept in sync by scene/camera-fixtures.json."""
from __future__ import annotations

import math

from .coords import Vec3


def apparent_width(width: float, depth: float, yaw_deg: float) -> float:
    yaw = math.radians(yaw_deg)
    return width * abs(math.cos(yaw)) + depth * abs(math.sin(yaw))


def framing_distance(viewport_width: float, viewport_height: float, camera: dict, level: dict) -> float:
    width = viewport_width if viewport_width > 0 else 1.0
    height = viewport_height if viewport_height > 0 else 1.0
    aspect = width / height
    rule = camera["portrait"] if aspect < 1 else camera["landscape"]
    tan_half = math.tan(math.radians(camera["fovDeg"]) / 2)
    fit_width = apparent_width(level["width"], level["depth"], camera["yawDeg"]) / (rule["fitWidth"] * 2 * tan_half * aspect)
    min_height = rule.get("minVisibleHeight")
    fit_height = 0.0 if min_height is None else min_height / (2 * tan_half)
    return max(fit_width, fit_height)


def camera_pose(lift: float, viewport_width: float, viewport_height: float, tower: dict) -> tuple[Vec3, Vec3]:
    camera, level = tower["camera"], tower["level"]
    last = len(tower["levels"]) - 1
    p = min(max(lift if math.isfinite(lift) else 0.0, 0.0), last)
    phase = p - math.floor(p)
    distance = framing_distance(viewport_width, viewport_height, camera, level) * (
        1 + camera["travelBulge"] * math.sin(math.pi * phase)
    )
    pitch, yaw = math.radians(camera["pitchDeg"]), math.radians(camera["yawDeg"])
    target_y = camera["targetHeight"] - p * level["height"]
    position = (
        math.sin(yaw) * math.cos(pitch) * distance,
        target_y + math.sin(pitch) * distance,
        math.cos(yaw) * math.cos(pitch) * distance,
    )
    return position, (0.0, target_y, 0.0)
```

`art/blender/towerlib/core/glb.py`:
```python
from __future__ import annotations

import json
import struct
from pathlib import Path


def read_glb_json(path: Path | str) -> dict:
    data = Path(path).read_bytes()
    magic, _version, _length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF":
        raise ValueError(f"{path} is not a GLB file")
    chunk_length, chunk_type = struct.unpack_from("<I4s", data, 12)
    if chunk_type != b"JSON":
        raise ValueError(f"{path}: first chunk is not JSON")
    return json.loads(data[20 : 20 + chunk_length])
```

`art/blender/towerlib/core/args.py`:
```python
from __future__ import annotations


def script_args(argv: list[str]) -> list[str]:
    """Blender passes script arguments after '--'."""
    return argv[argv.index("--") + 1 :] if "--" in argv else []
```

- [ ] **Step 5: Запустить и убедиться, что проходят**

Run: `pnpm art:test:py`
Expected: все тесты PASS. `test_camera` сверяется с `scene/camera-fixtures.json` из плана 01: Python-камера совпадает с сайтом.

- [ ] **Step 6: Commit**

```bash
git add art/palette.json art/requirements-dev.txt art/scripts/py.ts art/blender/towerlib art/tests package.json
git commit -m "feat(art): add pure-Python core for coordinates, palette, UVs, names and camera"
```

---

### Task 3: Кит примитивов и тесты внутри Blender

**Files:**
- Create: `art/blender/towerlib/kit/__init__.py`, `kit/scene.py`, `kit/materials.py`, `kit/primitives.py`
- Create: `art/tests/blender/run.py`, `art/scripts/test-blender.ts`
- Modify: `package.json` (`art:test:blender`, `art:test`)
- Test: `art/tests/blender/test_primitives.py`

**Interfaces:**
- Consumes: `to_blender`, `Vec3` (задача 2).
- Produces: `ROLES`, `reset_scene()`, `collection(role)`, `link(obj, role)`, `objects_in(role)`, `select_only(obj)`, `join(objects, name)`; `ALBEDO = "albedo"`, `albedo_material()`, `emission_material(name, color, strength)`, `placeholder_material()`; `finish(...)`, `paint(mesh, color)`, `rounded_box(name, size, *, color, radius=0.04, segments=2, role, at, yaw_deg, parent)`, `cylinder(..., hang=False)`, `sphere(...)`, `capsule(...)`, `plane(name, size_xz, *, color, ...)`, `tube(name, points, *, radius, color, ...)`, `screen_plane(name, size, *, uv, glow, strength, role, at, yaw_deg, parent)`.

- [ ] **Step 1: Раннер тестов внутри Blender**

`art/tests/blender/run.py`:
```python
"""Tiny test runner executed by Blender:
blender -b --factory-startup --python-exit-code 1 --python art/tests/blender/run.py -- [module ...]
"""
from __future__ import annotations

import importlib
import sys
import traceback
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "blender"))
sys.path.insert(0, str(HERE))

from towerlib.core.args import script_args  # noqa: E402
from towerlib.kit.scene import reset_scene  # noqa: E402

modules = script_args(sys.argv) or sorted(p.stem for p in HERE.glob("test_*.py"))
failures = 0
total = 0
for module_name in modules:
    module = importlib.import_module(module_name)
    for name in sorted(n for n in dir(module) if n.startswith("test_")):
        total += 1
        reset_scene()
        try:
            getattr(module, name)()
            print(f"PASS {module_name}.{name}")
        except Exception:  # noqa: BLE001 - report every failure, keep going
            failures += 1
            print(f"FAIL {module_name}.{name}")
            traceback.print_exc()
print(f"{total - failures}/{total} passed")
if failures:
    raise SystemExit(1)
```

`art/scripts/test-blender.ts`:
```ts
import { requireBlender, runBlender } from './blender.ts';

await runBlender(requireBlender(), ['--python', 'art/tests/blender/run.py', '--', ...process.argv.slice(2)]);
```

`package.json`:
```json
"art:test:blender": "tsx art/scripts/test-blender.ts",
"art:test": "pnpm art:test:py && pnpm art:test:blender"
```

- [ ] **Step 2: Написать падающий тест**

`art/tests/blender/test_primitives.py`:
```python
import bpy

from towerlib.core.palette import hex_to_linear
from towerlib.kit import primitives as kit
from towerlib.kit.scene import objects_in

TEAL = hex_to_linear("#1FA59A")


def _zs(obj):
    return [v.co.z for v in obj.data.vertices]


def _xs(obj):
    return [v.co.x for v in obj.data.vertices]


def test_rounded_box_has_size_color_and_bevel():
    obj = kit.rounded_box("box", (2.0, 1.0, 0.5), color=TEAL, radius=0.05)
    assert abs(max(_xs(obj)) - min(_xs(obj)) - 2.0) < 1e-4
    assert abs(max(_zs(obj)) - 1.0) < 1e-4 and abs(min(_zs(obj))) < 1e-4
    assert len(obj.data.polygons) > 6
    attr = obj.data.color_attributes.get("albedo")
    assert attr is not None and attr.domain == "CORNER"
    assert abs(attr.data[0].color[0] - TEAL[0]) < 1e-5
    assert obj.data.color_attributes.active_color.name == "albedo"
    assert obj.data.materials[0].name == "albedo"


def test_location_and_yaw_use_three_coordinates():
    obj = kit.rounded_box("placed", (1, 1, 1), color=TEAL, at=(1.0, 2.0, 3.0), yaw_deg=90.0)
    assert tuple(round(c, 5) for c in obj.location) == (1.0, -3.0, 2.0)
    assert abs(obj.rotation_euler[2] - 1.5707963) < 1e-5


def test_cylinder_stands_or_hangs():
    standing = kit.cylinder("stand", radius=0.1, height=0.5, color=TEAL)
    hanging = kit.cylinder("hang", radius=0.1, height=0.5, color=TEAL, hang=True)
    assert abs(min(_zs(standing))) < 1e-5 and abs(max(_zs(standing)) - 0.5) < 1e-5
    assert abs(max(_zs(hanging))) < 1e-5 and abs(min(_zs(hanging)) + 0.5) < 1e-5


def test_capsule_has_the_requested_total_height():
    obj = kit.capsule("cap", radius=0.25, height=0.3, color=TEAL)
    assert abs(min(_zs(obj))) < 1e-5 and abs(max(_zs(obj)) - 0.8) < 1e-4


def test_sphere_is_centered():
    obj = kit.sphere("ball", radius=0.5, color=TEAL)
    assert abs(max(_zs(obj)) + min(_zs(obj))) < 1e-5


def test_plane_faces_up():
    obj = kit.plane("floor", (4.0, 2.0), color=TEAL)
    assert len(obj.data.polygons) == 1
    assert obj.data.polygons[0].normal.z > 0.99


def test_tube_is_a_mesh_and_cleans_up_its_curve():
    obj = kit.tube("pipe", [(0, 0, 0), (0, 2, 0), (2, 2, 0)], radius=0.1, color=TEAL)
    assert obj.type == "MESH" and len(obj.data.vertices) > 0
    assert "pipe_curve" not in bpy.data.curves
    assert "pipe_holder" not in bpy.data.objects


def test_screen_plane_faces_the_camera_and_maps_uvs():
    from towerlib.core.uv import UvRect

    rect = UvRect(0, 0, 512, 256, 1024, 1024)
    obj = kit.screen_plane("screen-x", (0.6, 0.4), uv=rect, glow=(0.5, 0.5, 0.5))
    assert obj.data.polygons[0].normal.y < -0.99
    uvs = sorted(tuple(round(c, 5) for c in loop.uv) for loop in obj.data.uv_layers["screen"].data)
    assert uvs == sorted([(0.0, 0.75), (0.5, 0.75), (0.5, 1.0), (0.0, 1.0)])
    assert obj.name in [o.name for o in objects_in("screens")]


def test_objects_land_in_their_role_collection():
    obj = kit.rounded_box("in-dyn", (1, 1, 1), color=TEAL, role="dyn")
    assert obj.name in [o.name for o in objects_in("dyn")]
```

- [ ] **Step 3: Запустить и убедиться, что падает**

Run: `pnpm art:test:blender test_primitives`
Expected: FAIL — `ModuleNotFoundError: towerlib.kit`.

- [ ] **Step 4: Реализация**

`art/blender/towerlib/kit/__init__.py`:
```python
"""Blender (bpy) building blocks. Positions are given in three.js coordinates."""
```

`art/blender/towerlib/kit/scene.py`:
```python
"""Scene and collection helpers. Every object belongs to exactly one role collection."""
from __future__ import annotations

import bpy

ROLES = ("static", "screens", "glow", "dyn", "anchors", "hits", "lights", "occluders")


def reset_scene() -> None:
    """Empty factory scene: no default cube, camera or light."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def collection(role: str) -> bpy.types.Collection:
    if role not in ROLES:
        raise ValueError(f"unknown role {role!r}; expected one of {ROLES}")
    coll = bpy.data.collections.get(role)
    if coll is None:
        coll = bpy.data.collections.new(role)
        bpy.context.scene.collection.children.link(coll)
    return coll


def link(obj: bpy.types.Object, role: str) -> bpy.types.Object:
    collection(role).objects.link(obj)
    return obj


def objects_in(role: str) -> list[bpy.types.Object]:
    coll = bpy.data.collections.get(role)
    return list(coll.objects) if coll is not None else []


def select_only(obj: bpy.types.Object) -> None:
    for other in bpy.context.view_layer.objects:
        other.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def join(objects: list[bpy.types.Object], name: str) -> bpy.types.Object:
    """Joins meshes into the first one (keeping its parent and transform) and renames it."""
    if not objects:
        raise ValueError(f"nothing to join into {name!r}")
    target = objects[0]
    if len(objects) > 1:
        with bpy.context.temp_override(
            active_object=target,
            object=target,
            selected_objects=objects,
            selected_editable_objects=objects,
        ):
            bpy.ops.object.join()
    target.name = name
    target.data.name = name
    return target
```

`art/blender/towerlib/kit/materials.py`:
```python
"""Materials used only inside Blender (for baking). The web assigns its own materials by node name."""
from __future__ import annotations

import bpy

ALBEDO = "albedo"


def albedo_material() -> bpy.types.Material:
    """Matte diffuse material whose color comes from the 'albedo' color attribute."""
    mat = bpy.data.materials.get(ALBEDO)
    if mat is not None:
        return mat
    mat = bpy.data.materials.new(ALBEDO)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    attr = nodes.new("ShaderNodeAttribute")
    attr.attribute_type = "GEOMETRY"
    attr.attribute_name = ALBEDO
    links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.0
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def emission_material(name: str, color: tuple[float, float, float], strength: float) -> bpy.types.Material:
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (*color, 1.0)
    emit.inputs["Strength"].default_value = strength
    links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def placeholder_material() -> bpy.types.Material:
    """Single shared material for merged meshes, so the exporter writes one primitive per mesh."""
    return bpy.data.materials.get("export") or bpy.data.materials.new("export")
```

`art/blender/towerlib/kit/primitives.py`:
```python
"""Primitive builders. Sizes and positions are in three.js units: x width, y height, z depth."""
from __future__ import annotations

import math

import bmesh
import bpy

from ..core.coords import Vec3, to_blender
from ..core.uv import UvRect
from .materials import ALBEDO, albedo_material, emission_material
from .scene import link

Color = tuple[float, float, float]


def paint(mesh: bpy.types.Mesh, color: Color) -> None:
    attr = mesh.color_attributes.get(ALBEDO) or mesh.color_attributes.new(
        name=ALBEDO, type="FLOAT_COLOR", domain="CORNER"
    )
    attr.data.foreach_set("color", [*color, 1.0] * len(attr.data))
    mesh.color_attributes.active_color = attr
    mesh.color_attributes.render_color_index = mesh.color_attributes.find(ALBEDO)


def _place(obj, role, at, yaw_deg, parent):
    obj.location = to_blender(at)
    obj.rotation_euler = (0.0, 0.0, math.radians(yaw_deg))
    if parent is not None:
        obj.parent = parent
    return link(obj, role)


def finish(
    name: str,
    bm: bmesh.types.BMesh,
    color: Color,
    *,
    role: str = "static",
    at: Vec3 = (0.0, 0.0, 0.0),
    yaw_deg: float = 0.0,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    paint(mesh, color)
    mesh.materials.append(albedo_material())
    return _place(bpy.data.objects.new(name, mesh), role, at, yaw_deg, parent)


def rounded_box(name: str, size: Vec3, *, color: Color, radius: float = 0.04, segments: int = 2, **place) -> bpy.types.Object:
    """Box resting on y=0, centered in x/z."""
    width, height, depth = size
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(width, depth, height), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0.0, 0.0, height / 2), verts=bm.verts)
    r = min(radius, width / 2 - 1e-4, height / 2 - 1e-4, depth / 2 - 1e-4)
    if r > 0 and segments > 0:
        bmesh.ops.bevel(
            bm,
            geom=list(bm.edges),
            offset=r,
            offset_type="OFFSET",
            segments=segments,
            profile=0.5,
            affect="EDGES",
            clamp_overlap=True,
        )
    return finish(name, bm, color, **place)


def cylinder(name: str, *, radius: float, height: float, color: Color, segments: int = 20, hang: bool = False, **place) -> bpy.types.Object:
    """Vertical cylinder standing on y=0, or hanging below it (for arms pivoting at the shoulder)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments, radius1=radius, radius2=radius, depth=height)
    bmesh.ops.translate(bm, vec=(0.0, 0.0, -height / 2 if hang else height / 2), verts=bm.verts)
    return finish(name, bm, color, **place)


def sphere(name: str, *, radius: float, color: Color, segments: int = 24, **place) -> bpy.types.Object:
    bm = bmesh.new()
    rings = max(8, segments // 2)
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius)
    return finish(name, bm, color, **place)


def capsule(name: str, *, radius: float, height: float, color: Color, segments: int = 24, **place) -> bpy.types.Object:
    """Vertical capsule of total height height + 2 * radius, resting on y=0."""
    bm = bmesh.new()
    rings = max(8, segments // 2)
    rings += rings % 2  # an even ring count keeps an equator ring to stretch from
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius)
    for vert in bm.verts:
        if vert.co.z > 1e-6:
            vert.co.z += height
    bmesh.ops.translate(bm, vec=(0.0, 0.0, radius), verts=bm.verts)
    return finish(name, bm, color, **place)


def plane(name: str, size: tuple[float, float], *, color: Color, **place) -> bpy.types.Object:
    """Horizontal quad at y=0 facing up; size is (width x, depth z)."""
    width, depth = size
    bm = bmesh.new()
    corners = [(-width / 2, -depth / 2, 0.0), (width / 2, -depth / 2, 0.0), (width / 2, depth / 2, 0.0), (-width / 2, depth / 2, 0.0)]
    bm.faces.new([bm.verts.new(c) for c in corners])
    return finish(name, bm, color, **place)


def tube(name: str, points: list[Vec3], *, radius: float, color: Color, segments: int = 12, **place) -> bpy.types.Object:
    """Round tube through `points` (round the corners first with core.paths.round_corners)."""
    curve = bpy.data.curves.new(f"{name}_curve", type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = max(1, segments // 4)
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (*to_blender(co), 1.0)
    holder = bpy.data.objects.new(f"{name}_holder", curve)
    bpy.context.scene.collection.objects.link(holder)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(holder.evaluated_get(depsgraph))
    bpy.data.objects.remove(holder)
    bpy.data.curves.remove(curve)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bpy.data.meshes.remove(mesh)
    return finish(name, bm, color, **place)


def screen_plane(
    name: str,
    size: tuple[float, float],
    *,
    uv: UvRect,
    glow: Color,
    strength: float = 3.0,
    role: str = "screens",
    at: Vec3 = (0.0, 0.0, 0.0),
    yaw_deg: float = 0.0,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Vertical quad facing +Z (the camera), bottom edge at y=0, UVs mapped to an atlas rectangle."""
    width, height = size
    bm = bmesh.new()
    corners = [(-width / 2, 0.0, 0.0), (width / 2, 0.0, 0.0), (width / 2, 0.0, height), (-width / 2, 0.0, height)]
    face = bm.faces.new([bm.verts.new(c) for c in corners])
    layer = bm.loops.layers.uv.new("screen")
    for loop, co in zip(face.loops, uv.corners_blender()):
        loop[layer].uv = co
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(emission_material(f"emit-{name}", glow, strength))
    return _place(bpy.data.objects.new(name, mesh), role, at, yaw_deg, parent)
```

- [ ] **Step 5: Запустить и убедиться, что проходит**

Run: `pnpm art:test:blender test_primitives`
Expected: `9/9 passed`.

> Если Blender 4.5 отклонит имя свойства (например, `render_color_index`), заменить его по документации 4.5 и перезапустить. Тест для этого и нужен.

- [ ] **Step 6: Commit**

```bash
git add art/blender/towerlib/kit art/tests/blender art/scripts/test-blender.ts package.json
git commit -m "feat(art): add Blender primitive kit with an in-Blender test runner"
```

---

### Task 4: Атласы экранов и лиц роботов

**Files:**
- Create: `art/scripts/atlas.ts`, `art/scripts/faces-lib.ts`, `art/scripts/screens.ts`, `art/scripts/faces.ts`
- Create: `art/screens/screen.css` и 8 экранов `art/screens/*.html`
- Create: `src/engine/actors/faces.ts`
- Generated (коммитятся): `art/screens/manifest.json`, `art/faces/manifest.json`, `src/assets/textures/screens.webp`, `src/assets/textures/faces.webp`
- Modify: `package.json` (зависимость `sharp`, скрипты `art:screens`, `art:faces`)
- Test: `art/scripts/atlas.test.ts`, `art/scripts/faces-lib.test.ts`, `src/engine/actors/faces.test.ts`

**Interfaces:**
- Produces: `packAtlas(items, maxWidth, padding = 8): AtlasLayout`; `FACE_FRAMES`, `type FaceFrame`, `FACE_GRID = { cols: 4, rows: 2, cell: 128 }`, `faceUvOffset(frame): { x; y }`; `facePixels(frame)`, `faceSvg(frame)`. Манифест экранов: `{ width, height, screens: { [id]: { x, y, width, height, glow } } }`. Манифест лиц: `{ cols, rows, cell, frames }`.

- [ ] **Step 1: Зависимость**

```bash
pnpm add -D sharp@0.35.5
```

- [ ] **Step 2: Написать падающие тесты**

`art/scripts/atlas.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { packAtlas } from './atlas';

const first = { id: 'a', width: 512, height: 320 };
const items = [
  first,
  { id: 'b', width: 512, height: 640 },
  { id: 'c', width: 300, height: 600 },
  { id: 'd', width: 512, height: 320 },
  { id: 'e', width: 512, height: 320 },
];

describe('packAtlas', () => {
  const layout = packAtlas(items, 2048, 8);
  const rects = Object.entries(layout.rects);

  it('places every item inside the atlas with padding', () => {
    expect(rects).toHaveLength(items.length);
    for (const [, r] of rects) {
      expect(r.x).toBeGreaterThanOrEqual(8);
      expect(r.y).toBeGreaterThanOrEqual(8);
      expect(r.x + r.width).toBeLessThanOrEqual(layout.width - 8);
      expect(r.y + r.height).toBeLessThanOrEqual(layout.height - 8);
    }
  });

  it('never overlaps two items', () => {
    for (const [i, [, a]] of rects.entries()) {
      for (const [, b] of rects.slice(i + 1)) {
        const apart =
          a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
        expect(apart).toBe(true);
      }
    }
  });

  it('is deterministic', () => {
    expect(packAtlas([...items].reverse(), 2048, 8)).toEqual(layout);
  });

  it('rejects items wider than the atlas and duplicate ids', () => {
    expect(() => packAtlas([{ id: 'x', width: 4000, height: 10 }], 2048)).toThrow(/wider/);
    expect(() => packAtlas([first, first], 2048)).toThrow(/duplicate/);
  });
});
```

`art/scripts/faces-lib.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { FACE_FRAMES } from '../../src/engine/actors/faces';
import { facePixels, faceSvg } from './faces-lib';

describe('robot faces', () => {
  it('draws every frame inside the 16x16 grid', () => {
    for (const frame of FACE_FRAMES) {
      const pixels = facePixels(frame);
      expect(pixels.length).toBeGreaterThan(0);
      for (const [x, y] of pixels) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(16);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThan(16);
      }
    }
  });

  it('makes blink different from neutral', () => {
    expect(facePixels('blink')).not.toEqual(facePixels('neutral'));
  });

  it('renders one rect per lit pixel plus the screen background', () => {
    const rects = faceSvg('happy').match(/<rect /g) ?? [];
    expect(rects).toHaveLength(facePixels('happy').length + 1);
  });
});
```

`src/engine/actors/faces.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { FACE_FRAMES, faceUvOffset } from './faces';

describe('faceUvOffset', () => {
  it('keeps the neutral face at the origin cell', () => {
    expect(faceUvOffset('neutral')).toEqual({ x: 0, y: 0 });
  });

  it('walks right along the first row, then down to the second', () => {
    expect(faceUvOffset('blink')).toEqual({ x: 0.5, y: 0 });
    expect(faceUvOffset('surprised')).toEqual({ x: 0, y: 0.5 });
    expect(faceUvOffset('love')).toEqual({ x: 0.75, y: 0.5 });
  });

  it('has eight frames for a 4x2 atlas', () => {
    expect(FACE_FRAMES).toHaveLength(8);
  });
});
```

- [ ] **Step 3: Запустить и убедиться, что падают**

Run: `pnpm vitest run art/scripts/atlas.test.ts art/scripts/faces-lib.test.ts src/engine/actors/faces.test.ts`
Expected: FAIL — модулей нет.

- [ ] **Step 4: Реализация — чистые модули**

`src/engine/actors/faces.ts`:
```ts
export const FACE_FRAMES = [
  'neutral',
  'happy',
  'blink',
  'focus',
  'surprised',
  'annoyed',
  'sleepy',
  'love',
] as const;
export type FaceFrame = (typeof FACE_FRAMES)[number];

export const FACE_GRID = { cols: 4, rows: 2, cell: 128 } as const;

/** UV offset moving a face mesh mapped to cell 0 onto `frame` (glTF UVs: origin at the top-left). */
export function faceUvOffset(frame: FaceFrame): { x: number; y: number } {
  const index = FACE_FRAMES.indexOf(frame);
  return {
    x: (index % FACE_GRID.cols) / FACE_GRID.cols,
    y: Math.floor(index / FACE_GRID.cols) / FACE_GRID.rows,
  };
}
```

`art/scripts/atlas.ts`:
```ts
export interface AtlasItem {
  id: string;
  width: number;
  height: number;
}

export interface AtlasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AtlasLayout {
  width: number;
  height: number;
  rects: Record<string, AtlasRect>;
}

/** Shelf packing: tallest first, left to right, a new shelf when a row is full. */
export function packAtlas(items: readonly AtlasItem[], maxWidth: number, padding = 8): AtlasLayout {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`duplicate atlas id "${item.id}"`);
    ids.add(item.id);
    if (item.width + 2 * padding > maxWidth) throw new Error(`"${item.id}" is wider than the atlas`);
  }
  const sorted = [...items].sort((a, b) => b.height - a.height || a.id.localeCompare(b.id));
  const rects: Record<string, AtlasRect> = {};
  let x = padding;
  let y = padding;
  let shelf = 0;
  for (const item of sorted) {
    if (x + item.width + padding > maxWidth) {
      x = padding;
      y += shelf + padding;
      shelf = 0;
    }
    rects[item.id] = { x, y, width: item.width, height: item.height };
    x += item.width + padding;
    shelf = Math.max(shelf, item.height);
  }
  return { width: maxWidth, height: Math.ceil((y + shelf + padding) / 4) * 4, rects };
}
```

`art/scripts/faces-lib.ts`:
```ts
import { FACE_GRID, type FaceFrame } from '../../src/engine/actors/faces.ts';

type Eye = 'open' | 'closed' | 'happy' | 'wide' | 'half' | 'heart';
type Mouth = 'flat' | 'smile' | 'o' | 'frown' | 'none';

const LOOKS: Record<FaceFrame, { eye: Eye; mouth: Mouth }> = {
  neutral: { eye: 'open', mouth: 'flat' },
  happy: { eye: 'happy', mouth: 'smile' },
  blink: { eye: 'closed', mouth: 'flat' },
  focus: { eye: 'half', mouth: 'none' },
  surprised: { eye: 'wide', mouth: 'o' },
  annoyed: { eye: 'half', mouth: 'frown' },
  sleepy: { eye: 'closed', mouth: 'o' },
  love: { eye: 'heart', mouth: 'smile' },
};

const EYES: Record<Eye, string[]> = {
  open: ['.##.', '####', '####', '.##.'],
  closed: ['....', '....', '####', '....'],
  happy: ['.##.', '#..#', '....', '....'],
  wide: ['####', '#..#', '#..#', '####'],
  half: ['....', '####', '.##.', '....'],
  heart: ['#..#', '####', '.##.', '....'],
};

const MOUTHS: Record<Mouth, string[]> = {
  flat: ['......', '.####.', '......'],
  smile: ['#....#', '.####.', '......'],
  o: ['..##..', '.#..#.', '..##..'],
  frown: ['.####.', '#....#', '......'],
  none: ['......', '......', '......'],
};

const GRID = 16;

/** Lit pixels of a 16x16 pixel-art face: two eyes and a mouth. */
export function facePixels(frame: FaceFrame): Array<[number, number]> {
  const look = LOOKS[frame];
  const pixels: Array<[number, number]> = [];
  const stamp = (pattern: string[], ox: number, oy: number) => {
    pattern.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === '#') pixels.push([ox + x, oy + y]);
      });
    });
  };
  stamp(EYES[look.eye], 3, 4);
  stamp(EYES[look.eye], 9, 4);
  stamp(MOUTHS[look.mouth], 5, 10);
  return pixels;
}

export function faceSvg(frame: FaceFrame): string {
  const size = FACE_GRID.cell;
  const px = size / GRID;
  const lit = facePixels(frame)
    .map(([x, y]) => `<rect x="${x * px}" y="${y * px}" width="${px}" height="${px}" rx="1.5" fill="#7ef2d8"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="18" fill="#15181f"/>${lit}</svg>`;
}
```

- [ ] **Step 5: Запустить и убедиться, что проходят**

Run: `pnpm vitest run art/scripts/atlas.test.ts art/scripts/faces-lib.test.ts src/engine/actors/faces.test.ts`
Expected: PASS.

- [ ] **Step 6: Исходники экранов (языконезависимые макеты)**

`art/screens/screen.css`:
```css
* { box-sizing: border-box; margin: 0; }
body { overflow: hidden; font-size: 0; }
.row { display: flex; gap: 8px; align-items: center; }
.col { display: flex; flex-direction: column; gap: 8px; }
.bar { height: 7px; border-radius: 4px; background: rgb(28 27 34 / 0.28); }
.light .bar, .bar.light { background: rgb(255 255 255 / 0.78); }
.dot { width: 26px; height: 26px; border-radius: 50%; flex: none; }
.header { height: 44px; padding: 0 14px; display: flex; align-items: center; gap: 10px; }
.chat { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.bubble { max-width: 62%; padding: 10px 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 6px; }
.in { align-self: flex-start; background: #fff; }
.out { align-self: flex-end; }
```

`art/screens/chat-whatsapp.html`:
```html
<!doctype html><html><head><meta charset="utf-8"><meta name="screen-size" content="512x320">
<link rel="stylesheet" href="screen.css"><style>body{width:512px;height:320px;background:#e9e3da}.out{background:#d4f5c6}</style></head>
<body><div class="header light" style="background:#1f8f5f"><div class="dot" style="background:#cfe9da"></div><div class="bar" style="width:120px"></div></div>
<div class="chat"><div class="bubble in"><div class="bar" style="width:180px"></div><div class="bar" style="width:120px"></div></div>
<div class="bubble out"><div class="bar" style="width:160px"></div></div>
<div class="bubble in"><div class="bar" style="width:140px"></div></div>
<div class="bubble out"><div class="bar" style="width:190px"></div><div class="bar" style="width:90px"></div></div></div></body></html>
```

`art/screens/chat-telegram.html`:
```html
<!doctype html><html><head><meta charset="utf-8"><meta name="screen-size" content="512x320">
<link rel="stylesheet" href="screen.css"><style>body{width:512px;height:320px;background:#dbe7ef}.out{background:#e3f7d6}</style></head>
<body><div class="header light" style="background:#2a9fd8"><div class="dot" style="background:#bfe3f6"></div><div class="bar" style="width:140px"></div></div>
<div class="chat"><div class="bubble out"><div class="bar" style="width:150px"></div></div>
<div class="bubble in"><div class="bar" style="width:200px"></div><div class="bar" style="width:160px"></div><div class="bar" style="width:80px"></div></div>
<div class="bubble out"><div class="bar" style="width:120px"></div></div></div></body></html>
```

`art/screens/chat-instagram.html`:
```html
<!doctype html><html><head><meta charset="utf-8"><meta name="screen-size" content="512x320">
<link rel="stylesheet" href="screen.css"><style>body{width:512px;height:320px;background:#fafafa}.out{background:#efe3fb}.in{background:#efefef}</style></head>
<body><div class="header light" style="background:linear-gradient(90deg,#f58529,#dd2a7b,#8134af)"><div class="dot" style="background:#fff3"></div><div class="bar" style="width:110px"></div></div>
<div class="chat"><div class="bubble in"><div class="bar" style="width:170px"></div></div>
<div class="bubble out"><div class="bar" style="width:190px"></div><div class="bar" style="width:110px"></div></div>
<div class="bubble in"><div class="bar" style="width:130px"></div><div class="bar" style="width:90px"></div></div></div></body></html>
```

`art/screens/crm-kanban.html`:
```html
<!doctype html><html><head><meta charset="utf-8"><meta name="screen-size" content="512x320">
<link rel="stylesheet" href="screen.css"><style>body{width:512px;height:320px;background:#f3f1ec;padding:14px;display:flex;gap:10px}
.lane{flex:1;background:#e6e1d8;border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:8px}.card{background:#fff;border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px}.tag{height:6px;width:40px;border-radius:3px}</style></head>
<body><div class="lane"><div class="card"><div class="tag" style="background:#ff5a1f"></div><div class="bar" style="width:80%"></div></div><div class="card"><div class="tag" style="background:#ff5a1f"></div><div class="bar" style="width:60%"></div></div><div class="card"><div class="tag" style="background:#f2b33d"></div><div class="bar" style="width:70%"></div></div></div>
<div class="lane"><div class="card"><div class="tag" style="background:#f2b33d"></div><div class="bar" style="width:75%"></div></div><div class="card"><div class="tag" style="background:#1fa59a"></div><div class="bar" style="width:55%"></div></div></div>
<div class="lane"><div class="card"><div class="tag" style="background:#1fa59a"></div><div class="bar" style="width:85%"></div></div></div>
<div class="lane"><div class="card"><div class="tag" style="background:#2aabee"></div><div class="bar" style="width:65%"></div></div><div class="card"><div class="tag" style="background:#2aabee"></div><div class="bar" style="width:80%"></div></div></div></body></html>
```

`art/screens/code.html`:
```html
<!doctype html><html><head><meta charset="utf-8"><meta name="screen-size" content="512x640">
<link rel="stylesheet" href="screen.css"><style>body{width:512px;height:640px;background:#15171c;padding:16px;display:flex;flex-direction:column;gap:9px}
.l{display:flex;gap:8px}.n{width:18px;height:7px;border-radius:3px;background:#3a3f4a}.k{background:#c792ea}.f{background:#82aaff}.s{background:#c3e88d}.v{background:#f2b33d}.c{background:#5c6370}
.l span{height:7px;border-radius:3px;display:block}</style></head>
<body>
<div class="l"><i class="n"></i><span class="k" style="width:50px"></span><span class="f" style="width:120px"></span></div>
<div class="l"><i class="n"></i><span class="c" style="width:30px"></span><span class="v" style="width:90px"></span><span class="s" style="width:140px"></span></div>
<div class="l"><i class="n"></i><span class="k" style="width:40px"></span><span class="f" style="width:70px"></span><span class="v" style="width:60px"></span></div>
<div class="l"><i class="n"></i><span class="c" style="width:200px"></span></div>
<div class="l"><i class="n"></i><span class="k" style="width:60px"></span><span class="s" style="width:180px"></span></div>
<div class="l"><i class="n"></i><span class="f" style="width:110px"></span><span class="v" style="width:40px"></span></div>
<div class="l"><i class="n"></i><span class="k" style="width:50px"></span><span class="f" style="width:150px"></span></div>
<div class="l"><i class="n"></i><span class="s" style="width:240px"></span></div>
<div class="l"><i class="n"></i><span class="v" style="width:80px"></span><span class="f" style="width:90px"></span></div>
<div class="l"><i class="n"></i><span class="c" style="width:160px"></span></div>
<div class="l"><i class="n"></i><span class="k" style="width:40px"></span><span class="s" style="width:120px"></span><span class="v" style="width:50px"></span></div>
<div class="l"><i class="n"></i><span class="f" style="width:210px"></span></div>
<div class="l"><i class="n"></i><span class="k" style="width:70px"></span><span class="f" style="width:100px"></span></div>
<div class="l"><i class="n"></i><span class="s" style="width:190px"></span></div>
<div class="l"><i class="n"></i><span class="v" style="width:60px"></span><span class="c" style="width:120px"></span></div>
<div class="l"><i class="n"></i><span class="k" style="width:50px"></span><span class="f" style="width:140px"></span></div>
<div class="l"><i class="n"></i><span class="s" style="width:220px"></span></div>
<div class="l"><i class="n"></i><span class="f" style="width:90px"></span><span class="v" style="width:70px"></span></div>
<div class="l"><i class="n"></i><span class="c" style="width:180px"></span></div>
<div class="l"><i class="n"></i><span class="k" style="width:60px"></span><span class="s" style="width:110px"></span></div>
</body></html>
```

`art/screens/calendar.html`:
```html
<!doctype html><html><head><meta charset="utf-8"><meta name="screen-size" content="512x320">
<link rel="stylesheet" href="screen.css"><style>body{width:512px;height:320px;background:#fbf8f2;padding:14px;display:grid;grid-template-columns:repeat(7,1fr);grid-template-rows:20px repeat(5,1fr);gap:6px}
.h{background:#e4d6bf;border-radius:4px}.d{background:#efe8dc;border-radius:6px}.b1{background:#1fa59a}.b2{background:#f2b33d}.b3{background:#ff5a1f}</style></head>
<body><div class="h"></div><div class="h"></div><div class="h"></div><div class="h"></div><div class="h"></div><div class="h"></div><div class="h"></div>
<div class="d b1"></div><div class="d"></div><div class="d b2"></div><div class="d"></div><div class="d b1"></div><div class="d"></div><div class="d"></div>
<div class="d"></div><div class="d b3"></div><div class="d"></div><div class="d b1"></div><div class="d"></div><div class="d b2"></div><div class="d"></div>
<div class="d b2"></div><div class="d"></div><div class="d b1"></div><div class="d"></div><div class="d"></div><div class="d b1"></div><div class="d b3"></div>
<div class="d"></div><div class="d b1"></div><div class="d"></div><div class="d b2"></div><div class="d b1"></div><div class="d"></div><div class="d"></div>
<div class="d b1"></div><div class="d"></div><div class="d"></div><div class="d b1"></div><div class="d"></div><div class="d b2"></div><div class="d"></div></body></html>
```

`art/screens/dashboard.html`:
```html
<!doctype html><html><head><meta charset="utf-8"><meta name="screen-size" content="512x320">
<link rel="stylesheet" href="screen.css"><style>body{width:512px;height:320px;background:#1c1b22;padding:16px;display:flex;flex-direction:column;gap:14px}
.tiles{display:flex;gap:10px}.tile{flex:1;height:64px;border-radius:10px;background:#2a2933;padding:10px;display:flex;flex-direction:column;gap:8px}
.big{height:16px;border-radius:5px}.chart{flex:1;display:flex;align-items:flex-end;gap:10px;padding:0 4px}.col{flex:1;border-radius:6px 6px 0 0;background:#1fa59a}</style></head>
<body><div class="tiles"><div class="tile"><div class="bar light" style="width:50%"></div><div class="big" style="width:70%;background:#f2b33d"></div></div>
<div class="tile"><div class="bar light" style="width:40%"></div><div class="big" style="width:55%;background:#1fa59a"></div></div>
<div class="tile"><div class="bar light" style="width:60%"></div><div class="big" style="width:65%;background:#ff5a1f"></div></div></div>
<div class="chart"><div class="col" style="height:35%"></div><div class="col" style="height:50%"></div><div class="col" style="height:45%"></div><div class="col" style="height:65%"></div><div class="col" style="height:60%"></div><div class="col" style="height:80%"></div><div class="col" style="height:95%;background:#f2b33d"></div></div></body></html>
```

`art/screens/phone.html`:
```html
<!doctype html><html><head><meta charset="utf-8"><meta name="screen-size" content="300x600">
<link rel="stylesheet" href="screen.css"><style>body{width:300px;height:600px;background:#f3ebdd;display:flex;flex-direction:column}
.out{background:#1fa59a}.out .bar{background:rgb(255 255 255 / 0.8)}.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 14px}.chip{height:30px;border-radius:15px;border:2px solid #1c1b22;padding:0 12px;display:flex;align-items:center}
.input{margin:auto 14px 16px;height:44px;border-radius:22px;background:#fff;display:flex;align-items:center;padding:0 16px}</style></head>
<body><div class="header light" style="background:#1c1b22;height:64px"><div class="dot" style="background:#f2b33d"></div><div class="col"><div class="bar" style="width:110px"></div><div class="bar" style="width:60px;opacity:.6"></div></div></div>
<div class="chat"><div class="bubble in"><div class="bar" style="width:160px"></div><div class="bar" style="width:110px"></div></div>
<div class="bubble out"><div class="bar" style="width:120px"></div></div>
<div class="bubble in"><div class="bar" style="width:170px"></div><div class="bar" style="width:140px"></div><div class="bar" style="width:70px"></div></div></div>
<div class="chips"><div class="chip"><div class="bar" style="width:60px"></div></div><div class="chip"><div class="bar" style="width:80px"></div></div><div class="chip"><div class="bar" style="width:50px"></div></div></div>
<div class="input"><div class="bar" style="width:120px"></div></div></body></html>
```

- [ ] **Step 7: Генераторы**

`art/scripts/screens.ts`:
```ts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { packAtlas } from './atlas.ts';

const DIR = join('art', 'screens');
const OUT = join('src', 'assets', 'textures');

function sizeOf(file: string): { width: number; height: number } {
  const match = readFileSync(join(DIR, file), 'utf8').match(
    /<meta name="screen-size" content="(\d+)x(\d+)">/,
  );
  if (!match) throw new Error(`${file}: add <meta name="screen-size" content="WxH">`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

const items = readdirSync(DIR)
  .filter((file) => file.endsWith('.html'))
  .sort()
  .map((file) => ({ id: file.replace(/\.html$/, ''), ...sizeOf(file) }));
const layout = packAtlas(items, 2048, 8);
const rect = (id: string) => {
  const found = layout.rects[id];
  if (!found) throw new Error(`no atlas rect for ${id}`);
  return found;
};

const browser = await chromium.launch();
const shots = new Map<string, Buffer>();
for (const item of items) {
  const page = await browser.newPage({
    viewport: { width: item.width, height: item.height },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(join(DIR, `${item.id}.html`)).href);
  shots.set(item.id, await page.screenshot({ type: 'png' }));
  await page.close();
}
await browser.close();

const shot = (id: string) => {
  const buffer = shots.get(id);
  if (!buffer) throw new Error(`no screenshot for ${id}`);
  return buffer;
};

mkdirSync(OUT, { recursive: true });
await sharp({
  create: { width: layout.width, height: layout.height, channels: 3, background: '#101218' },
})
  .composite(items.map((item) => ({ input: shot(item.id), left: rect(item.id).x, top: rect(item.id).y })))
  .webp({ quality: 90 })
  .toFile(join(OUT, 'screens.webp'));

async function glow(id: string): Promise<string> {
  const { channels } = await sharp(shot(id)).stats();
  return `#${channels
    .slice(0, 3)
    .map((channel) => Math.round(channel.mean).toString(16).padStart(2, '0'))
    .join('')}`;
}

const screens: Record<string, unknown> = {};
for (const item of items) screens[item.id] = { ...rect(item.id), glow: await glow(item.id) };
writeFileSync(
  join(DIR, 'manifest.json'),
  `${JSON.stringify({ width: layout.width, height: layout.height, screens }, null, 2)}\n`,
);
console.log(`screens atlas ${layout.width}x${layout.height}, ${items.length} screens`);
```

`art/scripts/faces.ts`:
```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { FACE_FRAMES, FACE_GRID } from '../../src/engine/actors/faces.ts';
import { faceSvg } from './faces-lib.ts';

const { cols, rows, cell } = FACE_GRID;
mkdirSync(join('src', 'assets', 'textures'), { recursive: true });
mkdirSync(join('art', 'faces'), { recursive: true });

const cells = await Promise.all(
  FACE_FRAMES.map(async (frame, index) => ({
    input: await sharp(Buffer.from(faceSvg(frame))).png().toBuffer(),
    left: (index % cols) * cell,
    top: Math.floor(index / cols) * cell,
  })),
);
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#15181f' } })
  .composite(cells)
  .webp({ lossless: true })
  .toFile(join('src', 'assets', 'textures', 'faces.webp'));
writeFileSync(
  join('art', 'faces', 'manifest.json'),
  `${JSON.stringify({ cols, rows, cell, frames: FACE_FRAMES }, null, 2)}\n`,
);
console.log(`faces atlas ${cols * cell}x${rows * cell}`);
```

`package.json`:
```json
"art:screens": "tsx art/scripts/screens.ts",
"art:faces": "tsx art/scripts/faces.ts"
```

- [ ] **Step 8: Сгенерировать и проверить глазами**

Run: `pnpm art:screens && pnpm art:faces`
Expected: `screens atlas 2048xNNN, 8 screens`, `faces atlas 512x256`, созданы оба манифеста и два WebP.

Открыть `src/assets/textures/screens.webp` и `faces.webp` и посмотреть. Экраны не должны содержать слов, лица — читаться на маленьком размере.

- [ ] **Step 9: Commit**

```bash
git add art/scripts/atlas.ts art/scripts/atlas.test.ts art/scripts/faces-lib.ts art/scripts/faces-lib.test.ts art/scripts/screens.ts art/scripts/faces.ts art/screens art/faces src/engine/actors src/assets/textures package.json pnpm-lock.yaml
git commit -m "feat(art): generate screen and robot face atlases"
```

---

### Task 5: Оболочка этажа, реквизит, якоря и хитбоксы

**Files:**
- Create: `art/blender/towerlib/rig.py` (только `area_lamp` и `daylight` — используются реквизитом), `kit/anchors.py`, `kit/shell.py`, `kit/props.py`
- Test: `art/tests/blender/test_props.py`

**Interfaces:**
- Consumes: кит из задачи 3, `BuildContext`, `place`, `round_corners`, `naming` (задача 2), манифесты из задачи 4.
- Produces: `daylight(*, sun_energy=3.5, sun_angle_deg=10, sky_color=(0.78, 0.84, 0.95), sky_strength=0.7)`, `area_lamp(name, at, *, size=0.5, energy=180, color=(1.0, 0.9, 0.75))`; `anchor(name, at, **extras)`, `hitbox(name, size, at, *, action, yaw_deg=0)`; `level_shell(ctx, *, kind)`, `ceiling_occluder(ctx)`, `spine(ctx)`; `desk`, `monitor`, `server_rack`, `plant`, `ceiling_lamp`, `sorter`, `trash_bin`, `wall_phone`, `coffee_counter`, `pipe` — все `(ctx, name, at, …)`.

- [ ] **Step 1: Написать падающий тест**

`art/tests/blender/test_props.py`:
```python
from pathlib import Path

from towerlib.core.naming import is_valid
from towerlib.core.spec import load_context
from towerlib.kit import props, shell
from towerlib.kit.scene import objects_in

ART = Path(__file__).resolve().parents[2]


def _ctx():
    return load_context(ART)


def test_floor_shell_has_walls_and_a_ceiling_occluder():
    ctx = _ctx()
    parts = shell.level_shell(ctx, kind="floor")
    shell.ceiling_occluder(ctx)
    names = {p.name for p in parts}
    assert {"shell-floor", "shell-back", "shell-left", "shell-right"} <= names
    floor = next(p for p in parts if p.name == "shell-floor")
    # matrix_world is stale until the depsgraph updates, so add the location by hand.
    top = floor.location.z + max(v.co.z for v in floor.data.vertices)
    assert abs(top) < 1e-4
    assert len(objects_in("occluders")) == 1


def test_roof_shell_is_open():
    names = {p.name for p in shell.level_shell(_ctx(), kind="roof")}
    assert "shell-back" not in names and "shell-floor" in names


def test_monitor_screen_uses_its_atlas_rect():
    ctx = _ctx()
    parts = props.monitor(ctx, "mon", (0.0, 0.74, 0.0), screen_id="code")
    screen = next(p for p in parts if p.name == "screen-mon")
    rect = ctx.screens["code"].rect
    us = [loop.uv[0] for loop in screen.data.uv_layers["screen"].data]
    assert abs(min(us) - rect.x / rect.image_width) < 1e-6
    assert screen in objects_in("screens")


def test_unknown_screen_fails_loudly():
    try:
        props.monitor(_ctx(), "mon", (0.0, 0.0, 0.0), screen_id="nope")
    except KeyError as error:
        assert "nope" in str(error)
    else:
        raise AssertionError("expected KeyError")


def test_interactive_props_create_valid_anchors_and_hits():
    ctx = _ctx()
    props.sorter(ctx, "sorter", (3.6, 0.0, -0.8))
    props.wall_phone(ctx, "phone", (0.0, 0.9, -2.85))
    anchors = [o.name for o in objects_in("anchors")]
    hits = [o.name for o in objects_in("hits")]
    assert {"anchor__capsule-in", "anchor__capsule-lead", "anchor__capsule-support", "anchor__capsule-spam", "anchor__phone-screen"} <= set(anchors)
    assert {"hit__sorter", "hit__phone"} <= set(hits)
    assert all(is_valid(n) for n in anchors + hits)
    phone_hit = next(o for o in objects_in("hits") if o.name == "hit__phone")
    assert phone_hit["action"] == "open-chat" and phone_hit.hide_render


def test_lamp_adds_a_glow_disc_and_a_light():
    props.ceiling_lamp(_ctx(), "lamp", (0.0, 3.5, 0.0))
    assert len(objects_in("glow")) == 1
    assert len(objects_in("lights")) == 1


def test_server_rack_leds_glow():
    props.server_rack(_ctx(), "rack", (-5.0, 0.0, -2.4), leds=6)
    assert len(objects_in("glow")) == 6
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `pnpm art:test:blender test_props`
Expected: FAIL — нет модулей `towerlib.kit.props` и `towerlib.kit.shell`.

- [ ] **Step 3: Реализация**

`art/blender/towerlib/rig.py`:
```python
"""Lighting shared by every level: warm sun from the front-left, soft sky, interior lamps."""
from __future__ import annotations

import math

import bpy

from .core.coords import Vec3, to_blender
from .kit.scene import link


def daylight(
    *,
    sun_energy: float = 3.5,
    sun_angle_deg: float = 10.0,
    sky_color: tuple[float, float, float] = (0.78, 0.84, 0.95),
    sky_strength: float = 0.7,
) -> None:
    world = bpy.data.worlds.new("sky")
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (*sky_color, 1.0)
    background.inputs["Strength"].default_value = sky_strength
    bpy.context.scene.world = world
    data = bpy.data.lights.new("sun", type="SUN")
    data.energy = sun_energy
    data.angle = math.radians(sun_angle_deg)
    data.color = (1.0, 0.95, 0.88)
    sun = bpy.data.objects.new("sun", data)
    # Travels toward the back wall and down: the light comes from the open front, slightly from the left.
    sun.rotation_euler = (math.radians(50.0), 0.0, math.radians(-35.0))
    link(sun, "lights")


def area_lamp(
    name: str,
    at: Vec3,
    *,
    size: float = 0.5,
    energy: float = 180.0,
    color: tuple[float, float, float] = (1.0, 0.9, 0.75),
) -> bpy.types.Object:
    data = bpy.data.lights.new(name, type="AREA")
    data.size = size
    data.energy = energy
    data.color = color
    lamp = bpy.data.objects.new(name, data)
    lamp.location = to_blender(at)  # area lights point down by default
    return link(lamp, "lights")
```

`art/blender/towerlib/kit/anchors.py`:
```python
from __future__ import annotations

import bpy

from ..core import naming
from ..core.coords import Vec3, to_blender
from .primitives import rounded_box
from .scene import link


def anchor(name: str, at: Vec3, **extras: str | float | int) -> bpy.types.Object:
    """Empty node the web looks up by name (without the 'anchor__' prefix)."""
    empty = bpy.data.objects.new(naming.anchor(name), None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.location = to_blender(at)
    for key, value in extras.items():
        empty[key] = value
    return link(empty, "anchors")


def hitbox(name: str, size: Vec3, at: Vec3, *, action: str, yaw_deg: float = 0.0) -> bpy.types.Object:
    """Invisible box for pointer hits; hidden from the bake, exported for the web."""
    obj = rounded_box(naming.hit(name), size, color=(1.0, 1.0, 1.0), radius=0.0, segments=0, role="hits", at=at, yaw_deg=yaw_deg)
    obj["action"] = action
    obj.hide_render = True
    return obj
```

`art/blender/towerlib/kit/shell.py`:
```python
"""Level shell: floor slab, walls (no front wall: it is a cutaway), the ceiling occluder and the tower spine."""
from __future__ import annotations

from ..core.spec import BuildContext
from .primitives import rounded_box, tube

WALL = 0.2


def level_shell(ctx: BuildContext, *, kind: str) -> list:
    d, p = ctx.dims, ctx.palette
    inner = d.height - d.slab
    parts = [rounded_box("shell-floor", (d.width, d.slab, d.depth), color=p["slab"], radius=0.03, at=(0.0, -d.slab, 0.0))]
    if kind == "roof":
        parts.append(rounded_box("shell-parapet", (d.width, 0.5, WALL), color=p["sand-dark"], radius=0.03, at=(0.0, 0.0, -d.depth / 2 + WALL / 2)))
        return parts
    parts += [
        rounded_box("shell-back", (d.width, inner, WALL), color=p["sand"], radius=0.03, at=(0.0, 0.0, -d.depth / 2 + WALL / 2)),
        rounded_box("shell-left", (WALL, inner, d.depth), color=p["sand-dark"], radius=0.03, at=(-d.width / 2 + WALL / 2, 0.0, 0.0)),
        rounded_box("shell-right", (WALL, inner, d.depth), color=p["sand-dark"], radius=0.03, at=(d.width / 2 - WALL / 2, 0.0, 0.0)),
    ]
    return parts


def ceiling_occluder(ctx: BuildContext):
    """The slab of the level above: blocks sky light during the bake, removed before export."""
    d = ctx.dims
    return rounded_box("occluder-ceiling", (d.width, d.slab, d.depth), color=ctx.palette["slab"], radius=0.0, segments=0, role="occluders", at=(0.0, d.height - d.slab, 0.0))


def spine(ctx: BuildContext):
    """Vertical pneumatic tube running through every level at tower.tube.x/z."""
    t, d = ctx.tower["tube"], ctx.dims
    points = [(t["x"], -d.slab, t["z"]), (t["x"], d.height - d.slab, t["z"])]
    return tube("spine", points, radius=t["radius"], color=ctx.palette["brass"])
```

`art/blender/towerlib/kit/props.py`:
```python
"""Furniture and machines. Every builder takes (ctx, name, at, ...) in three.js coordinates."""
from __future__ import annotations

from ..core.coords import Vec3, place
from ..core.paths import round_corners
from ..core.spec import BuildContext
from ..rig import area_lamp
from .anchors import anchor, hitbox
from .primitives import cylinder, rounded_box, screen_plane, sphere, tube


def desk(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0, width: float = 1.5, depth: float = 0.75, height: float = 0.74) -> list:
    p, top = ctx.palette, 0.05
    parts = [rounded_box(f"{name}-top", (width, top, depth), color=p["wood"], radius=0.02, at=place((0.0, height - top, 0.0), at, yaw_deg), yaw_deg=yaw_deg)]
    for side, label in ((-1, "l"), (1, "r")):
        parts.append(rounded_box(f"{name}-leg-{label}", (0.06, height - top, depth * 0.85), color=p["steel"], radius=0.01, at=place((side * (width / 2 - 0.1), 0.0, 0.0), at, yaw_deg), yaw_deg=yaw_deg))
    return parts


def monitor(ctx: BuildContext, name: str, at: Vec3, *, screen_id: str, yaw_deg: float = 0.0, size: tuple[float, float] = (0.62, 0.38)) -> list:
    info = ctx.screens[screen_id]
    p, (w, h) = ctx.palette, size
    return [
        rounded_box(f"{name}-stand", (0.08, 0.2, 0.06), color=p["ink"], radius=0.01, at=place((0.0, 0.0, -0.06), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-body", (w + 0.05, h + 0.05, 0.04), color=p["ink"], radius=0.015, at=place((0.0, 0.18, -0.06), at, yaw_deg), yaw_deg=yaw_deg),
        screen_plane(f"screen-{name}", size, uv=info.rect, glow=info.glow, at=place((0.0, 0.205, -0.038), at, yaw_deg), yaw_deg=yaw_deg),
    ]


def server_rack(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0, height: float = 2.0, leds: int = 10) -> list:
    p = ctx.palette
    parts = [rounded_box(f"{name}-body", (0.7, height, 0.6), color=p["ink"], radius=0.03, at=at, yaw_deg=yaw_deg)]
    for i in range(leds):
        y = 0.25 + i * (height - 0.4) / max(1, leds - 1)
        color = p["signal"] if i % 3 == 0 else p["teal"]
        parts.append(rounded_box(f"{name}-led-{i}", (0.42, 0.035, 0.02), color=color, radius=0.0, segments=0, role="glow", at=place((0.0, y, 0.305), at, yaw_deg), yaw_deg=yaw_deg))
    return parts


def plant(ctx: BuildContext, name: str, at: Vec3) -> list:
    p = ctx.palette
    parts = [cylinder(f"{name}-pot", radius=0.18, height=0.32, color=p["signal"], at=at)]
    for i, (dx, dy, dz, r) in enumerate([(0.0, 0.55, 0.0, 0.22), (0.12, 0.72, 0.05, 0.16), (-0.1, 0.7, -0.06, 0.15)]):
        parts.append(sphere(f"{name}-leaf-{i}", radius=r, color=p["plant"], segments=16, at=(at[0] + dx, at[1] + dy, at[2] + dz)))
    return parts


def ceiling_lamp(ctx: BuildContext, name: str, at: Vec3, *, energy: float = 180.0) -> list:
    p = ctx.palette
    area_lamp(f"{name}-light", (at[0], at[1] - 0.05, at[2]), size=0.5, energy=energy)
    return [
        cylinder(f"{name}-shade", radius=0.32, height=0.08, color=p["ink"], at=at),
        cylinder(f"{name}-disc", radius=0.26, height=0.012, color=p["white"], role="glow", at=(at[0], at[1] - 0.012, at[2])),
    ]


def sorter(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    """Sorting machine: capsules drop into the hopper and leave through three colored outlets."""
    p = ctx.palette
    parts = [
        rounded_box(f"{name}-base", (1.2, 0.9, 0.8), color=p["steel"], radius=0.06, at=at, yaw_deg=yaw_deg),
        rounded_box(f"{name}-hopper", (0.5, 0.35, 0.5), color=p["brass"], radius=0.05, at=place((0.0, 0.9, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-panel", (0.5, 0.25, 0.02), color=p["ink"], radius=0.01, at=place((0.0, 0.45, 0.41), at, yaw_deg), yaw_deg=yaw_deg),
    ]
    for label, color, dx in (("lead", "mustard", -0.35), ("support", "teal", 0.0), ("spam", "signal", 0.35)):
        parts.append(cylinder(f"{name}-out-{label}", radius=0.08, height=0.2, color=p[color], at=place((dx, 0.0, 0.48), at, yaw_deg), yaw_deg=yaw_deg))
        anchor(f"capsule-{label}", place((dx, 0.3, 0.55), at, yaw_deg))
    anchor("capsule-in", place((0.0, 1.35, 0.0), at, yaw_deg))
    hitbox(name, (1.3, 1.4, 0.9), at, action="sort-demo", yaw_deg=yaw_deg)
    return parts


def trash_bin(ctx: BuildContext, name: str, at: Vec3) -> list:
    p = ctx.palette
    return [
        cylinder(f"{name}-bin", radius=0.22, height=0.5, color=p["signal"], at=at),
        cylinder(f"{name}-rim", radius=0.24, height=0.04, color=p["ink"], at=(at[0], at[1] + 0.5, at[2])),
    ]


def wall_phone(ctx: BuildContext, name: str, at: Vec3) -> list:
    """Giant phone on the back wall: the live chat hotspot."""
    info, p = ctx.screens["phone"], ctx.palette
    parts = [
        rounded_box(f"{name}-body", (1.1, 2.0, 0.12), color=p["ink"], radius=0.12, segments=3, at=at),
        screen_plane(f"screen-{name}", (0.96, 1.8), uv=info.rect, glow=info.glow, at=(at[0], at[1] + 0.1, at[2] + 0.062)),
    ]
    hitbox(name, (1.1, 2.0, 0.3), at, action="open-chat")
    anchor(f"{name}-screen", (at[0], at[1] + 1.0, at[2] + 0.07))
    return parts


def coffee_counter(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    p = ctx.palette
    return [
        rounded_box(f"{name}-counter", (1.2, 0.9, 0.6), color=p["wood"], radius=0.03, at=at, yaw_deg=yaw_deg),
        rounded_box(f"{name}-machine", (0.36, 0.42, 0.32), color=p["robot-dark"], radius=0.04, at=place((-0.25, 0.9, -0.05), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-light", (0.06, 0.06, 0.02), color=p["teal"], radius=0.0, segments=0, role="glow", at=place((-0.25, 1.2, 0.115), at, yaw_deg), yaw_deg=yaw_deg),
        cylinder(f"{name}-cup", radius=0.05, height=0.09, color=p["white"], at=place((0.2, 0.9, 0.05), at, yaw_deg)),
    ]


def pipe(ctx: BuildContext, name: str, points: list[Vec3], *, color: str = "brass", radius: float = 0.07) -> list:
    return [tube(name, round_corners(points, 0.25), radius=radius, color=ctx.palette[color])]
```

- [ ] **Step 4: Запустить и убедиться, что проходит**

Run: `pnpm art:test:blender test_props`
Expected: `7/7 passed`.

- [ ] **Step 5: Commit**

```bash
git add art/blender/towerlib/rig.py art/blender/towerlib/kit/anchors.py art/blender/towerlib/kit/shell.py art/blender/towerlib/kit/props.py art/tests/blender/test_props.py
git commit -m "feat(art): add level shell, props, anchors and hit boxes"
```

---

### Task 6: Параметрический робот

**Files:**
- Create: `art/blender/towerlib/kit/robot.py`
- Test: `art/tests/blender/test_robot.py`

**Interfaces:**
- Consumes: кит, `naming`, `face_cell_rect`, `BuildContext`.
- Produces: `ACCESSORIES = ("headset", "stamp", "cap", "helmet", "none")`, `ACTIVITIES = ("typing", "sorting", "idle")`, `@dataclass RobotSpec(id, at, yaw_deg=0, accessory="none", activity="idle", body="robot", accent="teal", hover=0.25)`, `build_robot(spec, ctx) -> root`. Узлы: `dyn__<id>` (`role`, `activity`, `accessory` в extras), `dyn__<id>__body`, `__head` (с антенной и аксессуаром), `__face`, `__arm-l`, `__arm-r` (точка вращения — плечо).

- [ ] **Step 1: Написать падающий тест**

`art/tests/blender/test_robot.py`:
```python
from pathlib import Path

import bpy

from towerlib.core.naming import is_valid
from towerlib.core.spec import load_context
from towerlib.kit.robot import RobotSpec, build_robot
from towerlib.kit.scene import objects_in

ART = Path(__file__).resolve().parents[2]


def _build(**overrides):
    spec = RobotSpec(id="op-1", at=(1.0, 0.0, -1.0), accessory="headset", activity="typing", **overrides)
    return build_robot(spec, load_context(ART))


def test_robot_has_named_animatable_parts():
    root = _build()
    names = {o.name for o in objects_in("dyn")}
    assert {"dyn__op-1", "dyn__op-1__body", "dyn__op-1__head", "dyn__op-1__face", "dyn__op-1__arm-l", "dyn__op-1__arm-r"} <= names
    assert all(is_valid(n) for n in names), names
    assert root["role"] == "robot" and root["activity"] == "typing" and root["accessory"] == "headset"


def test_extras_are_merged_into_their_parts():
    _build()
    leftovers = [o.name for o in bpy.data.objects if any(tag in o.name for tag in ("antenna", "-acc-", "-hand-"))]
    assert leftovers == []


def test_arms_pivot_at_the_shoulder_and_hang_down():
    _build()
    arm = bpy.data.objects["dyn__op-1__arm-l"]
    assert arm.parent.name == "dyn__op-1"
    assert max(v.co.z for v in arm.data.vertices) < 1e-4
    assert min(v.co.z for v in arm.data.vertices) < -0.3


def test_head_sits_above_the_body():
    _build()
    head = bpy.data.objects["dyn__op-1__head"]
    body = bpy.data.objects["dyn__op-1__body"]
    assert head.location.z > body.location.z + 0.5


def test_unknown_accessory_is_rejected():
    try:
        build_robot(RobotSpec(id="x", at=(0.0, 0.0, 0.0), accessory="crown"), load_context(ART))
    except ValueError as error:
        assert "crown" in str(error)
    else:
        raise AssertionError("expected ValueError")
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `pnpm art:test:blender test_robot`
Expected: FAIL — нет модуля `towerlib.kit.robot`.

- [ ] **Step 3: Реализация**

`art/blender/towerlib/kit/robot.py`:
```python
"""Hover robot: rounded body, screen face, antenna, arms that pivot at the shoulders, a job accessory."""
from __future__ import annotations

import math
from dataclasses import dataclass

import bpy

from ..core import naming
from ..core.coords import Vec3, to_blender
from ..core.spec import BuildContext
from ..core.uv import face_cell_rect
from .primitives import capsule, cylinder, rounded_box, screen_plane, sphere
from .scene import join, link

ACCESSORIES = ("headset", "stamp", "cap", "helmet", "none")
ACTIVITIES = ("typing", "sorting", "idle")


@dataclass(frozen=True)
class RobotSpec:
    id: str
    at: Vec3
    yaw_deg: float = 0.0
    accessory: str = "none"
    activity: str = "idle"
    body: str = "robot"
    accent: str = "teal"
    hover: float = 0.25


def _accessory(spec: RobotSpec, ctx: BuildContext, head) -> list:
    p, i = ctx.palette, spec.id
    if spec.accessory == "headset":
        return [
            rounded_box(f"{i}-acc-ear-l", (0.06, 0.16, 0.16), color=p["ink"], radius=0.03, role="dyn", at=(-0.3, 0.12, 0.0), parent=head),
            rounded_box(f"{i}-acc-ear-r", (0.06, 0.16, 0.16), color=p["ink"], radius=0.03, role="dyn", at=(0.3, 0.12, 0.0), parent=head),
            rounded_box(f"{i}-acc-band", (0.66, 0.04, 0.06), color=p["ink"], radius=0.02, role="dyn", at=(0.0, 0.41, 0.0), parent=head),
            rounded_box(f"{i}-acc-mic", (0.03, 0.03, 0.2), color=p["ink"], radius=0.01, role="dyn", at=(-0.3, 0.1, 0.12), parent=head),
        ]
    if spec.accessory == "stamp":
        return [rounded_box(f"{i}-acc-visor", (0.6, 0.05, 0.3), color=p[spec.accent], radius=0.02, role="dyn", at=(0.0, 0.38, 0.12), parent=head)]
    if spec.accessory == "cap":
        return [
            cylinder(f"{i}-acc-cap", radius=0.22, height=0.1, color=p["signal"], role="dyn", at=(0.0, 0.4, 0.0), parent=head),
            rounded_box(f"{i}-acc-brim", (0.36, 0.03, 0.2), color=p["ink"], radius=0.01, role="dyn", at=(0.0, 0.4, 0.2), parent=head),
        ]
    if spec.accessory == "helmet":
        return [
            sphere(f"{i}-acc-helmet", radius=0.3, color=p["mustard"], role="dyn", at=(0.0, 0.25, 0.0), parent=head),
            cylinder(f"{i}-acc-helmet-brim", radius=0.34, height=0.03, color=p["mustard"], role="dyn", at=(0.0, 0.3, 0.0), parent=head),
        ]
    return []


def build_robot(spec: RobotSpec, ctx: BuildContext) -> bpy.types.Object:
    if spec.accessory not in ACCESSORIES:
        raise ValueError(f"unknown accessory {spec.accessory!r}; expected one of {ACCESSORIES}")
    if spec.activity not in ACTIVITIES:
        raise ValueError(f"unknown activity {spec.activity!r}; expected one of {ACTIVITIES}")
    p, h = ctx.palette, spec.hover
    body_color, accent = p[spec.body], p[spec.accent]

    root = bpy.data.objects.new(naming.dyn(spec.id), None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = to_blender(spec.at)
    root.rotation_euler = (0.0, 0.0, math.radians(spec.yaw_deg))
    root["role"] = "robot"
    root["activity"] = spec.activity
    root["accessory"] = spec.accessory
    link(root, "dyn")

    capsule(naming.dyn(spec.id, "body"), radius=0.26, height=0.22, color=body_color, role="dyn", at=(0.0, h, 0.0), parent=root)
    head = rounded_box(naming.dyn(spec.id, "head"), (0.56, 0.4, 0.46), color=body_color, radius=0.12, segments=3, role="dyn", at=(0.0, h + 0.76, 0.0), parent=root)
    extras = [
        cylinder(f"{spec.id}-antenna", radius=0.018, height=0.16, color=p["robot-dark"], role="dyn", at=(0.0, 0.4, 0.0), parent=head),
        sphere(f"{spec.id}-antenna-tip", radius=0.045, color=accent, role="dyn", at=(0.0, 0.58, 0.0), parent=head),
        *_accessory(spec, ctx, head),
    ]
    join([head, *extras], naming.dyn(spec.id, "head"))

    faces = ctx.faces
    screen_plane(
        naming.dyn(spec.id, "face"),
        (0.42, 0.26),
        uv=face_cell_rect(0, faces.cols, faces.rows, faces.cell),
        glow=(0.35, 0.95, 0.85),
        strength=1.5,
        role="dyn",
        at=(0.0, 0.07, 0.232),
        parent=head,
    )

    for side, label in ((-1, "l"), (1, "r")):
        arm = cylinder(naming.dyn(spec.id, f"arm-{label}"), radius=0.05, height=0.34, color=p["robot-dark"], hang=True, role="dyn", at=(side * 0.31, h + 0.56, 0.0), parent=root)
        hand = sphere(f"{spec.id}-hand-{label}", radius=0.07, color=accent, role="dyn", at=(0.0, -0.36, 0.0), parent=arm)
        join([arm, hand], naming.dyn(spec.id, f"arm-{label}"))
    return root
```

- [ ] **Step 4: Запустить и убедиться, что проходит**

Run: `pnpm art:test:blender test_robot`
Expected: `5/5 passed`.

- [ ] **Step 5: Commit**

```bash
git add art/blender/towerlib/kit/robot.py art/tests/blender/test_robot.py
git commit -m "feat(art): add a parametric hover robot with animatable parts"
```

---

### Task 7: Запекание света: развёртка, Cycles, денойз, кодирование

**Files:**
- Create: `art/blender/towerlib/bake.py`
- Test: `art/tests/blender/test_bake.py`

**Interfaces:**
- Consumes: `objects_in`, `join`, `select_only` (задача 3), `daylight` (задача 5).
- Produces: `LIGHTMAP_UV = "lightmap"`, `@dataclass BakeSettings(size=1024, samples=512, margin_px=8, exposure=1.0, headroom=2.0, denoise=True, seed=7)`, `join_static() -> Object`, `unwrap_lightmap(obj, *, margin=0.004)`, `configure_cycles(settings)`, `bake_irradiance(obj, settings) -> Image`, `denoise(image) -> Image`, `encode_lightmap(image, path, settings) -> dict`, `write_flat_lightmap(path, settings) -> dict`.

- [ ] **Step 1: Написать падающий тест**

`art/tests/blender/test_bake.py`:
```python
import tempfile
from pathlib import Path

import bpy
import numpy as np

from towerlib import bake, rig
from towerlib.kit import primitives as kit
from towerlib.kit.scene import reset_scene

GREY = (0.6, 0.6, 0.6)


def _bake_floor(*, with_block: bool, samples: int):
    kit.plane("floor", (4.0, 4.0), color=GREY)
    if with_block:
        kit.rounded_box("block", (1.0, 1.0, 1.0), color=GREY, radius=0.0, segments=0, role="occluders")
    rig.daylight()
    static = bake.join_static()
    bake.unwrap_lightmap(static)
    settings = bake.BakeSettings(size=128, samples=samples, denoise=False)
    return bake.bake_irradiance(static, settings), settings


def _luminance(image) -> np.ndarray:
    width, height = image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    return pixels.reshape(height, width, 4)[:, :, :3].mean(axis=2)


def _noise(image) -> float:
    lum = _luminance(image)
    mask = lum > 1e-6
    inner = np.zeros_like(mask)
    inner[1:-1, 1:-1] = mask[1:-1, 1:-1] & mask[:-2, 1:-1] & mask[2:, 1:-1] & mask[1:-1, :-2] & mask[1:-1, 2:]
    padded = np.pad(lum, 1, mode="edge")
    box = sum(padded[dy : dy + lum.shape[0], dx : dx + lum.shape[1]] for dy in range(3) for dx in range(3)) / 9.0
    return float(np.std((lum - box)[inner]))


def test_a_block_casts_a_contact_shadow():
    image, _ = _bake_floor(with_block=True, samples=32)
    shadowed = np.percentile(_luminance(image)[_luminance(image) > 1e-6], 5)
    reset_scene()
    image, _ = _bake_floor(with_block=False, samples=32)
    open_floor = np.percentile(_luminance(image)[_luminance(image) > 1e-6], 5)
    assert shadowed < open_floor * 0.7, (shadowed, open_floor)


def test_denoise_reduces_noise():
    image, _ = _bake_floor(with_block=True, samples=4)
    raw = _noise(image)
    clean = _noise(bake.denoise(image))
    assert clean < raw * 0.6, (clean, raw)


def test_encoded_lightmap_is_a_png_in_range():
    image, settings = _bake_floor(with_block=False, samples=8)
    out = Path(tempfile.mkdtemp()) / "lightmap test.png"
    stats = bake.encode_lightmap(image, out, settings)
    assert out.exists()
    loaded = bpy.data.images.load(str(out))
    pixels = np.empty(loaded.size[0] * loaded.size[1] * 4, dtype=np.float32)
    loaded.pixels.foreach_get(pixels)
    assert pixels.min() >= 0.0 and pixels.max() <= 1.0
    assert stats["mean"] > 0.05


def test_flat_lightmap_encodes_full_light():
    out = Path(tempfile.mkdtemp()) / "flat.png"
    bake.write_flat_lightmap(out, bake.BakeSettings(size=8))
    loaded = bpy.data.images.load(str(out))
    loaded.colorspace_settings.name = "Non-Color"
    value = loaded.pixels[0]
    assert abs(value - 0.7353569) < 0.01  # sRGB encoding of 1.0 / headroom (0.5)
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `pnpm art:test:blender test_bake`
Expected: FAIL — нет модуля `towerlib.bake`.

- [ ] **Step 3: Реализация**

`art/blender/towerlib/bake.py`:
```python
"""Lightmap baking: light without albedo (the web multiplies by vertex colors), denoised and encoded with headroom."""
from __future__ import annotations

import math
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

import bpy
import numpy as np

from .kit.scene import join, objects_in, select_only

LIGHTMAP_UV = "lightmap"


@dataclass(frozen=True)
class BakeSettings:
    size: int = 1024
    samples: int = 512
    margin_px: int = 8
    exposure: float = 1.0
    headroom: float = 2.0
    denoise: bool = True
    seed: int = 7


def join_static() -> bpy.types.Object:
    meshes = [o for o in objects_in("static") if o.type == "MESH" and o.parent is None]
    return join(meshes, "static")


def unwrap_lightmap(obj: bpy.types.Object, *, margin: float = 0.004) -> None:
    mesh = obj.data
    for layer in list(mesh.uv_layers):
        mesh.uv_layers.remove(layer)
    layer = mesh.uv_layers.new(name=LIGHTMAP_UV)
    mesh.uv_layers.active = layer
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66.0), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=True, margin=margin)
    bpy.ops.object.mode_set(mode="OBJECT")


def configure_cycles(settings: BakeSettings) -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = settings.samples
    scene.cycles.seed = settings.seed
    scene.cycles.max_bounces = 4
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 0
    scene.cycles.transmission_bounces = 0
    scene.cycles.volume_bounces = 0
    scene.cycles.transparent_max_bounces = 0
    bake = scene.render.bake
    bake.use_pass_direct = True
    bake.use_pass_indirect = True
    bake.use_pass_color = False
    bake.margin = settings.margin_px
    bake.margin_type = "EXTEND"
    bake.target = "IMAGE_TEXTURES"
    bake.use_clear = True


def bake_irradiance(obj: bpy.types.Object, settings: BakeSettings) -> bpy.types.Image:
    """Diffuse light (direct + indirect, without albedo) into a float image."""
    configure_cycles(settings)
    image = bpy.data.images.new(f"{obj.name}-irradiance", width=settings.size, height=settings.size, alpha=False, float_buffer=True)
    for slot in obj.material_slots:
        nodes = slot.material.node_tree.nodes
        node = nodes.get("bake-target") or nodes.new("ShaderNodeTexImage")
        node.name = "bake-target"
        node.image = image
        nodes.active = node
    select_only(obj)
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, margin=settings.margin_px, use_clear=True, target="IMAGE_TEXTURES")
    return image


def denoise(image: bpy.types.Image) -> bpy.types.Image:
    """Runs OpenImageDenoise through the compositor of a throwaway scene and reads the result back."""
    width, height = image.size
    scene = bpy.data.scenes.new("denoise")
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 1
    scene.cycles.device = "CPU"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.use_compositing = True
    scene.render.use_sequencer = False
    camera = bpy.data.objects.new("denoise-camera", bpy.data.cameras.new("denoise-camera"))
    scene.collection.objects.link(camera)
    scene.camera = camera
    scene.use_nodes = True
    tree = scene.node_tree
    for node in list(tree.nodes):
        tree.nodes.remove(node)
    source = tree.nodes.new("CompositorNodeImage")
    source.image = image
    denoiser = tree.nodes.new("CompositorNodeDenoise")
    denoiser.use_hdr = True
    denoiser.prefilter = "NONE"
    output = tree.nodes.new("CompositorNodeComposite")
    tree.links.new(source.outputs["Image"], denoiser.inputs["Image"])
    tree.links.new(denoiser.outputs["Image"], output.inputs["Image"])
    target = Path(tempfile.gettempdir()) / f"tower-denoise-{os.getpid()}-{image.name}.exr"
    scene.render.filepath = str(target)
    scene.render.image_settings.file_format = "OPEN_EXR"
    scene.render.image_settings.color_depth = "32"
    bpy.ops.render.render(write_still=True, scene=scene.name)
    result = bpy.data.images.load(str(target), check_existing=False)
    result.name = f"{image.name}-denoised"
    result.pixels[0]  # force the pixel buffer to load before the file is gone
    bpy.data.scenes.remove(scene)
    return result


def _srgb_encode(linear: np.ndarray) -> np.ndarray:
    return np.where(linear <= 0.0031308, linear * 12.92, 1.055 * np.power(linear, 1.0 / 2.4) - 0.055)


def _save_png(rgb_srgb: np.ndarray, size: tuple[int, int], path: Path) -> None:
    width, height = size
    rgba = np.ones((width * height, 4), dtype=np.float32)
    rgba[:, :3] = rgb_srgb
    image = bpy.data.images.new(path.stem, width=width, height=height, alpha=False, float_buffer=False)
    image.colorspace_settings.name = "Non-Color"  # values are already sRGB-encoded: no second conversion
    image.pixels.foreach_set(rgba.ravel())
    path.parent.mkdir(parents=True, exist_ok=True)
    image.filepath_raw = str(path)
    image.file_format = "PNG"
    image.save()


def encode_lightmap(image: bpy.types.Image, path: Path, settings: BakeSettings) -> dict[str, float]:
    """Stores irradiance * exposure / headroom as sRGB PNG; returns stats in stored units."""
    width, height = image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    rgb = pixels.reshape(-1, 4)[:, :3] * (settings.exposure / settings.headroom)
    clipped = float(np.mean(rgb > 1.0))
    rgb = np.clip(rgb, 0.0, 1.0)
    _save_png(_srgb_encode(rgb), (width, height), path)
    luminance = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    return {
        "mean": float(luminance.mean()),
        "p05": float(np.percentile(luminance, 5)),
        "p95": float(np.percentile(luminance, 95)),
        "clipped": clipped,
    }


def write_flat_lightmap(path: Path, settings: BakeSettings) -> dict[str, float]:
    """Uniform 'full light' lightmap for fast drafts (--no-bake): the web shows plain palette colors."""
    value = min(1.0, settings.exposure / settings.headroom)
    rgb = np.full((settings.size * settings.size, 3), value, dtype=np.float32)
    _save_png(_srgb_encode(rgb), (settings.size, settings.size), path)
    return {"mean": value, "p05": value, "p95": value, "clipped": 0.0}
```

- [ ] **Step 4: Запустить и убедиться, что проходит**

Run: `pnpm art:test:blender test_bake`
Expected: `4/4 passed` за 1–3 минуты на процессоре.

> **Если денойз через композитор не работает в фоновом режиме** (тест `test_denoise_reduces_noise` падает с ошибкой рендера), выполнить два изменения в одном коммите:
> 1. По умолчанию поставить `BakeSettings.denoise = False`.
> 2. В `build_level.py` (задача 9) поднять `--samples` финальной сборки до 1024.
>
> Остальной конвейер от этого не меняется.

- [ ] **Step 5: Commit**

```bash
git add art/blender/towerlib/bake.py art/tests/blender/test_bake.py
git commit -m "feat(art): bake, denoise and encode lightmaps with headroom"
```

---

### Task 8: Экспорт GLB, сжатие и контракт этажа

**Files:**
- Create: `art/blender/towerlib/export.py`, `art/scripts/optimize.ts`, `art/scripts/level-contract.ts`, `art/scripts/built-levels.test.ts`
- Modify: `package.json` (зависимости gltf-transform и meshoptimizer)
- Test: `art/tests/blender/test_export.py`, `art/scripts/level-contract.test.ts`

**Interfaces:**
- Consumes: всё из задач 3–7.
- Produces (Python): `finalize_for_export()`, `merge_role(role, name)`, `export_glb(path)`. Produces (TS): `createIO()`, `stripStaticNormals(doc)`, `optimizeLevel(input, output)`, `encodeLightmap(input, output)`; `NODE_NAME`, `interface LevelBudget`, `DEFAULT_LEVEL_BUDGET`, `interface ContractReport { errors: string[]; triangles: number }`, `checkLevelDocument(doc)`, `checkBudgets(report, sizes, budget?)`.

- [ ] **Step 1: Зависимости**

```bash
pnpm add -D @gltf-transform/core@4.5.1 @gltf-transform/functions@4.5.1 @gltf-transform/extensions@4.5.1 meshoptimizer@1.3.0
```

- [ ] **Step 2: Написать падающие тесты**

`art/scripts/level-contract.test.ts`:
```ts
import { Document } from '@gltf-transform/core';
import { describe, expect, it } from 'vitest';
import { checkBudgets, checkLevelDocument, DEFAULT_LEVEL_BUDGET } from './level-contract';

type Attr = 'POSITION' | 'NORMAL' | 'COLOR_0' | 'TEXCOORD_0';
const SIZES: Record<Attr, [type: 'VEC2' | 'VEC3' | 'VEC4', count: number]> = {
  POSITION: ['VEC3', 9],
  NORMAL: ['VEC3', 9],
  COLOR_0: ['VEC4', 12],
  TEXCOORD_0: ['VEC2', 6],
};

function level(nodes: Array<[name: string, attrs: Attr[]]>): Document {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  for (const [name, attrs] of nodes) {
    const prim = doc.createPrimitive();
    for (const attr of attrs) {
      const [type, count] = SIZES[attr];
      prim.setAttribute(
        attr,
        doc.createAccessor().setType(type).setArray(new Float32Array(count)).setBuffer(buffer),
      );
    }
    scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  }
  return doc;
}

const VALID: Array<[string, Attr[]]> = [
  ['static', ['POSITION', 'COLOR_0', 'TEXCOORD_0']],
  ['screens', ['POSITION', 'TEXCOORD_0']],
  ['glow', ['POSITION', 'COLOR_0']],
  ['dyn__op-1__head', ['POSITION', 'NORMAL', 'COLOR_0']],
  ['dyn__op-1__face', ['POSITION', 'NORMAL', 'TEXCOORD_0']],
  ['hit__phone', ['POSITION']],
];

describe('checkLevelDocument', () => {
  it('accepts a level that follows the contract', () => {
    const report = checkLevelDocument(level(VALID));
    expect(report.errors).toEqual([]);
    expect(report.triangles).toBe(VALID.length);
  });

  it('rejects names with dots or unknown prefixes', () => {
    const report = checkLevelDocument(level([...VALID, ['dyn.op-1', ['POSITION']]]));
    expect(report.errors.join()).toContain('dyn.op-1');
  });

  it('requires vertex colors and lightmap UVs on static, without normals', () => {
    expect(checkLevelDocument(level([['static', ['POSITION', 'TEXCOORD_0']]])).errors.join()).toContain('COLOR_0');
    expect(
      checkLevelDocument(level([['static', ['POSITION', 'NORMAL', 'COLOR_0', 'TEXCOORD_0']]])).errors.join(),
    ).toContain('NORMAL');
  });

  it('requires normals and colors on moving parts', () => {
    const report = checkLevelDocument(level([...VALID, ['dyn__op-2__body', ['POSITION', 'COLOR_0']]]));
    expect(report.errors.join()).toContain('dyn__op-2__body');
  });

  it('requires exactly one static node', () => {
    expect(checkLevelDocument(level(VALID.slice(1))).errors.join()).toContain('exactly one');
  });
});

describe('checkBudgets', () => {
  it('passes within budget and fails loudly over it', () => {
    const ok = { errors: [], triangles: 1000 };
    expect(checkBudgets(ok, { glb: 100_000, lightmap: 100_000 })).toEqual([]);
    const fat = checkBudgets({ errors: [], triangles: 90_000 }, { glb: 900_000, lightmap: 3_000_000 });
    expect(fat).toHaveLength(3);
    expect(DEFAULT_LEVEL_BUDGET.maxTriangles).toBe(60_000);
  });
});
```

`art/scripts/built-levels.test.ts`:
```ts
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkBudgets, checkLevelDocument } from './level-contract';
import { createIO } from './optimize';

const DIR = join('src', 'assets', 'levels');
const levels = (() => {
  try {
    return readdirSync(DIR).filter((file) => file.endsWith('.glb'));
  } catch {
    return [];
  }
})();

describe.skipIf(levels.length === 0)('built levels in src/assets/levels', () => {
  for (const file of levels) {
    it(`${file} follows the contract and fits the budget`, async () => {
      const doc = await (await createIO()).read(join(DIR, file));
      const report = checkLevelDocument(doc);
      expect(report.errors).toEqual([]);
      const lightmap = join(DIR, file.replace(/\.glb$/, '.lightmap.webp'));
      expect(
        checkBudgets(report, { glb: statSync(join(DIR, file)).size, lightmap: statSync(lightmap).size }),
      ).toEqual([]);
    });
  }
});
```

`art/tests/blender/test_export.py`:
```python
import tempfile
from pathlib import Path

from towerlib import bake, export
from towerlib.core.glb import read_glb_json
from towerlib.core.naming import is_valid
from towerlib.core.spec import load_context
from towerlib.kit import anchors, primitives, props
from towerlib.kit.robot import RobotSpec, build_robot

ART = Path(__file__).resolve().parents[2]


def test_exported_glb_follows_the_level_contract():
    ctx = load_context(ART)
    primitives.plane("floor", (4.0, 4.0), color=ctx.palette["slab"])
    props.desk(ctx, "desk", (0.0, 0.0, 0.0))
    props.monitor(ctx, "mon", (0.0, 0.74, 0.0), screen_id="code")
    props.ceiling_lamp(ctx, "lamp", (0.0, 3.4, 0.0))
    build_robot(RobotSpec(id="r1", at=(1.0, 0.0, 0.0), accessory="headset", activity="typing"), ctx)
    anchors.anchor("test", (0.0, 1.0, 0.0), role="station")
    anchors.hitbox("box", (0.5, 0.5, 0.5), (0.0, 0.0, 0.0), action="noop")
    static = bake.join_static()
    bake.unwrap_lightmap(static)

    export.finalize_for_export()
    export.merge_role("screens", "screens")
    export.merge_role("glow", "glow")
    out = Path(tempfile.mkdtemp()) / "test level.glb"
    export.export_glb(out)

    gltf = read_glb_json(out)
    nodes = gltf["nodes"]
    names = {n.get("name") for n in nodes}
    assert {"static", "screens", "glow", "dyn__r1", "dyn__r1__head", "dyn__r1__face", "anchor__test", "hit__box"} <= names
    assert all(is_valid(n) for n in names), names
    meshes = {n["name"]: gltf["meshes"][n["mesh"]] for n in nodes if "mesh" in n}
    attrs = lambda name: set(meshes[name]["primitives"][0]["attributes"])  # noqa: E731
    assert {"POSITION", "COLOR_0", "TEXCOORD_0"} <= attrs("static")
    assert "TEXCOORD_0" in attrs("screens")
    assert {"NORMAL", "COLOR_0"} <= attrs("dyn__r1__body")
    assert len(meshes["screens"]["primitives"]) == 1
    assert next(n for n in nodes if n.get("name") == "dyn__r1").get("extras", {}).get("role") == "robot"
    assert "sun" not in names and "lamp-light" not in names
```

- [ ] **Step 3: Запустить и убедиться, что падают**

Run: `pnpm vitest run art/scripts/level-contract.test.ts art/scripts/built-levels.test.ts`
Expected: FAIL — модулей `./level-contract` и `./optimize` нет.

Run: `pnpm art:test:blender test_export`
Expected: FAIL — нет модуля `towerlib.export`.

- [ ] **Step 4: Реализация**

`art/blender/towerlib/export.py`:
```python
"""Final clean-up and glTF export. Names and attributes must match docs/02-implementation-plan.md, contract 3.2."""
from __future__ import annotations

from pathlib import Path

import bpy

from .kit.materials import placeholder_material
from .kit.scene import join, objects_in


def finalize_for_export() -> None:
    """Removes bake-only objects and gives merged roles a single material (one glTF primitive each)."""
    for obj in objects_in("occluders") + objects_in("lights"):
        bpy.data.objects.remove(obj, do_unlink=True)
    for obj in [o for o in bpy.data.objects if o.type == "CAMERA"]:
        bpy.data.objects.remove(obj, do_unlink=True)
    shared = placeholder_material()
    for role in ("screens", "glow"):
        for obj in objects_in(role):
            obj.data.materials.clear()
            obj.data.materials.append(shared)


def merge_role(role: str, name: str) -> bpy.types.Object | None:
    meshes = [o for o in objects_in(role) if o.type == "MESH" and o.parent is None]
    return join(meshes, name) if meshes else None


def export_glb(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_yup=True,
        export_extras=True,
        export_apply=False,
        export_texcoords=True,
        export_normals=True,
        export_materials="NONE",
        export_vertex_color="ACTIVE",
        export_active_vertex_color_when_no_material=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
    )
```

`art/scripts/optimize.ts`:
```ts
import { type Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, quantize, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

export async function createIO(): Promise<NodeIO> {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
}

/** The baked material ignores normals, so static geometry ships without them. */
export function stripStaticNormals(doc: Document): void {
  for (const node of doc.getRoot().listNodes()) {
    if (node.getName() !== 'static') continue;
    for (const primitive of node.getMesh()?.listPrimitives() ?? []) primitive.setAttribute('NORMAL', null);
  }
}

export async function optimizeLevel(input: string, output: string): Promise<void> {
  const io = await createIO();
  const doc = await io.read(input);
  stripStaticNormals(doc);
  await doc.transform(dedup(), prune(), weld(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(output, doc);
}

export async function encodeLightmap(input: string, output: string): Promise<void> {
  await sharp(input).webp({ quality: 92, smartSubsample: true, effort: 6 }).toFile(output);
}
```

`art/scripts/level-contract.ts`:
```ts
import type { Document } from '@gltf-transform/core';

export const NODE_NAME =
  /^(static|screens|glow|dyn__[a-z0-9-]+(__[a-z0-9-]+)?|anchor__[a-z0-9-]+(__[a-z0-9-]+)*|hit__[a-z0-9-]+)$/;

export interface LevelBudget {
  maxTriangles: number;
  maxGlbBytes: number;
  maxLightmapBytes: number;
}

export const DEFAULT_LEVEL_BUDGET: LevelBudget = {
  maxTriangles: 60_000,
  maxGlbBytes: 450_000,
  maxLightmapBytes: 250_000,
};

export interface ContractReport {
  errors: string[];
  triangles: number;
}

export function checkLevelDocument(doc: Document): ContractReport {
  const errors: string[] = [];
  let triangles = 0;
  const nodes = doc.getRoot().listNodes();
  for (const node of nodes) {
    if (!NODE_NAME.test(node.getName())) errors.push(`unexpected node name "${node.getName()}"`);
  }
  if (nodes.filter((node) => node.getName() === 'static').length !== 1) {
    errors.push('expected exactly one "static" node');
  }
  for (const node of nodes) {
    const name = node.getName();
    for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
      const count = primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')?.getCount() ?? 0;
      triangles += count / 3;
      const has = (semantic: string) => primitive.getAttribute(semantic) !== null;
      if (name === 'static') {
        if (!has('COLOR_0')) errors.push('static: missing COLOR_0 (albedo)');
        if (!has('TEXCOORD_0')) errors.push('static: missing TEXCOORD_0 (lightmap UV)');
        if (has('NORMAL')) errors.push('static: NORMAL must be stripped');
      } else if (name === 'screens' && !has('TEXCOORD_0')) {
        errors.push('screens: missing TEXCOORD_0');
      } else if (name === 'glow' && !has('COLOR_0')) {
        errors.push('glow: missing COLOR_0');
      } else if (name.startsWith('dyn__') && name.endsWith('__face') && !has('TEXCOORD_0')) {
        errors.push(`${name}: faces need TEXCOORD_0`);
      } else if (name.startsWith('dyn__') && !name.endsWith('__face') && (!has('NORMAL') || !has('COLOR_0'))) {
        errors.push(`${name}: moving parts need NORMAL and COLOR_0`);
      }
    }
  }
  return { errors, triangles: Math.round(triangles) };
}

export function checkBudgets(
  report: ContractReport,
  sizes: { glb: number; lightmap: number },
  budget: LevelBudget = DEFAULT_LEVEL_BUDGET,
): string[] {
  const problems: string[] = [];
  if (report.triangles > budget.maxTriangles) {
    problems.push(`triangles ${report.triangles} > ${budget.maxTriangles}`);
  }
  if (sizes.glb > budget.maxGlbBytes) problems.push(`GLB ${sizes.glb} B > ${budget.maxGlbBytes} B`);
  if (sizes.lightmap > budget.maxLightmapBytes) {
    problems.push(`lightmap ${sizes.lightmap} B > ${budget.maxLightmapBytes} B`);
  }
  return problems;
}
```

- [ ] **Step 5: Запустить и убедиться, что проходят**

Run: `pnpm vitest run art/scripts/level-contract.test.ts art/scripts/built-levels.test.ts`
Expected: PASS (тест готовых этажей пропущен — их пока нет).

Run: `pnpm art:test:blender test_export`
Expected: `1/1 passed`. Если экспортёр положил вершинные цвета не туда (нет `COLOR_0` у `static`) — сверить опции экспорта с выводом `pnpm art:doctor` и документацией 4.5.

- [ ] **Step 6: Commit**

```bash
git add art/blender/towerlib/export.py art/scripts/optimize.ts art/scripts/level-contract.ts art/scripts/level-contract.test.ts art/scripts/built-levels.test.ts art/tests/blender/test_export.py package.json pnpm-lock.yaml
git commit -m "feat(art): export levels to GLB, compress them and enforce the level contract"
```

---

### Task 9: Сборка одной командой, тестовая комната, превью и matcap

**Files:**
- Create: `art/blender/build_level.py`, `art/blender/render_preview.py`, `art/blender/render_matcap.py`, `art/blender/levels/__init__.py`, `art/blender/levels/test_room.py`
- Create: `art/scripts/build-args.ts`, `art/scripts/build.ts`, `art/scripts/preview.ts`, `art/scripts/matcap.ts`
- Generated: `src/assets/textures/matcap.webp`
- Modify: `package.json` (`art:build`, `art:preview`, `art:matcap`)
- Test: `art/scripts/build-args.test.ts`

**Interfaces:**
- Produces: `parseBuildArgs(argv): { level: string; draft: boolean; noBake: boolean }`; модули этажей с функцией `build(ctx: BuildContext) -> None`; команды `pnpm art:build <level> [--draft] [--no-bake]`, `pnpm art:preview <level>`, `pnpm art:matcap`.

- [ ] **Step 1: Написать падающий тест**

`art/scripts/build-args.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseBuildArgs } from './build-args';

describe('parseBuildArgs', () => {
  it('reads the level and defaults to a final bake', () => {
    expect(parseBuildArgs(['agents'])).toEqual({ level: 'agents', draft: false, noBake: false });
  });

  it('reads flags in any order', () => {
    expect(parseBuildArgs(['--draft', 'test-room', '--no-bake'])).toEqual({
      level: 'test-room',
      draft: true,
      noBake: true,
    });
  });

  it('rejects a missing level, unknown flags and bad ids', () => {
    expect(() => parseBuildArgs([])).toThrow(/level/);
    expect(() => parseBuildArgs(['agents', '--turbo'])).toThrow(/--turbo/);
    expect(() => parseBuildArgs(['Agents Floor'])).toThrow(/a-z/);
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `pnpm vitest run art/scripts/build-args.test.ts`
Expected: FAIL — модуля `./build-args` нет.

- [ ] **Step 3: Реализация — Node**

`art/scripts/build-args.ts`:
```ts
export interface BuildArgs {
  level: string;
  draft: boolean;
  noBake: boolean;
}

export function parseBuildArgs(argv: readonly string[]): BuildArgs {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  for (const flag of flags) {
    if (flag !== '--draft' && flag !== '--no-bake') throw new Error(`unknown flag ${flag}`);
  }
  const level = argv.find((arg) => !arg.startsWith('--'));
  if (!level) throw new Error('usage: pnpm art:build <level> [--draft] [--no-bake]');
  if (!/^[a-z][a-z0-9-]*$/.test(level)) throw new Error(`level id "${level}": use a-z, 0-9 and "-"`);
  return { level, draft: flags.has('--draft'), noBake: flags.has('--no-bake') };
}
```

`art/scripts/build.ts`:
```ts
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { requireBlender, runBlender } from './blender.ts';
import { parseBuildArgs } from './build-args.ts';
import { checkBudgets, checkLevelDocument } from './level-contract.ts';
import { createIO, encodeLightmap, optimizeLevel } from './optimize.ts';

const args = parseBuildArgs(process.argv.slice(2));
const tower = JSON.parse(readFileSync(join('scene', 'tower.json'), 'utf8')) as {
  levels: Array<{ id: string }>;
};
const shipped = tower.levels.some((level) => level.id === args.level);
const work = join('art', 'out', args.level);
const target = shipped ? join('src', 'assets', 'levels') : join(work, 'final');
mkdirSync(target, { recursive: true });

const started = Date.now();
await runBlender(requireBlender(), [
  '--python',
  'art/blender/build_level.py',
  '--',
  '--level',
  args.level,
  '--out',
  work,
  '--samples',
  args.draft ? '64' : '512',
  ...(args.noBake ? ['--no-bake'] : []),
]);

const glb = join(target, `${args.level}.glb`);
const lightmap = join(target, `${args.level}.lightmap.webp`);
await optimizeLevel(join(work, `${args.level}.raw.glb`), glb);
await encodeLightmap(join(work, `${args.level}.lightmap.png`), lightmap);

const report = checkLevelDocument(await (await createIO()).read(glb));
const sizes = { glb: statSync(glb).size, lightmap: statSync(lightmap).size };
const problems = [...report.errors, ...checkBudgets(report, sizes)];
const hash = createHash('sha256').update(readFileSync(glb)).digest('hex').slice(0, 16);

console.table({
  level: args.level,
  shipped,
  triangles: report.triangles,
  'glb KB': (sizes.glb / 1024).toFixed(1),
  'lightmap KB': (sizes.lightmap / 1024).toFixed(1),
  'glb sha256': hash,
  seconds: ((Date.now() - started) / 1000).toFixed(0),
});
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
```

`art/scripts/preview.ts`:
```ts
import { join } from 'node:path';
import { requireBlender, runBlender } from './blender.ts';

const level = process.argv[2] ?? 'test-room';
const out = join('art', 'out', level, 'preview.png');
await runBlender(requireBlender(), [
  '--python',
  'art/blender/render_preview.py',
  '--',
  '--level',
  level,
  '--out',
  out,
  '--width',
  process.argv[3] ?? '900',
  '--height',
  process.argv[4] ?? '1200',
]);
console.log(`preview: ${out}`);
```

`art/scripts/matcap.ts`:
```ts
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { requireBlender, runBlender } from './blender.ts';

const png = join('art', 'out', 'matcap.png');
mkdirSync(join('art', 'out'), { recursive: true });
await runBlender(requireBlender(), ['--python', 'art/blender/render_matcap.py', '--', '--out', png]);
await sharp(png).webp({ quality: 95 }).toFile(join('src', 'assets', 'textures', 'matcap.webp'));
console.log('matcap: src/assets/textures/matcap.webp');
```

`package.json`:
```json
"art:build": "tsx art/scripts/build.ts",
"art:preview": "tsx art/scripts/preview.ts",
"art:matcap": "tsx art/scripts/matcap.ts"
```

- [ ] **Step 4: Реализация — Blender**

`art/blender/levels/__init__.py`:
```python
"""One module per level. Each exposes build(ctx: BuildContext) -> None and creates its own lights."""
```

`art/blender/levels/test_room.py`:
```python
"""Small level for pipeline tests. Not shipped (its id is not in scene/tower.json)."""
from __future__ import annotations

from towerlib import rig
from towerlib.core.spec import BuildContext
from towerlib.kit import anchors, props, shell
from towerlib.kit.robot import RobotSpec, build_robot


def build(ctx: BuildContext) -> None:
    rig.daylight()
    shell.level_shell(ctx, kind="floor")
    shell.ceiling_occluder(ctx)
    shell.spine(ctx)
    props.desk(ctx, "desk", (-1.5, 0.0, -1.0))
    props.monitor(ctx, "mon", (-1.9, 0.74, -0.95), screen_id="code", yaw_deg=25.0)
    props.ceiling_lamp(ctx, "lamp", (0.0, 3.5, -0.5))
    props.plant(ctx, "plant", (4.5, 0.0, -2.2))
    build_robot(RobotSpec(id="op-1", at=(-1.5, 0.0, -1.7), accessory="headset", activity="typing"), ctx)
    anchors.anchor("station-1", (-1.5, 1.0, -1.0))
```

`art/blender/build_level.py`:
```python
"""Builds one level:
blender -b --factory-startup --python-exit-code 1 --python art/blender/build_level.py -- --level agents --out art/out/agents
"""
from __future__ import annotations

import argparse
import importlib
import json
import sys
import time
from pathlib import Path

ART = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ART / "blender"))

from towerlib import bake, export  # noqa: E402
from towerlib.core.args import script_args  # noqa: E402
from towerlib.core.spec import load_context  # noqa: E402
from towerlib.kit.scene import reset_scene  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--level", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--samples", type=int, default=512)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--exposure", type=float, default=1.0)
    parser.add_argument("--no-bake", action="store_true")
    parser.add_argument("--no-denoise", action="store_true")
    args = parser.parse_args(script_args(sys.argv))

    started = time.time()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    reset_scene()
    ctx = load_context(ART)
    importlib.import_module(f"levels.{args.level.replace('-', '_')}").build(ctx)

    static = bake.join_static()
    bake.unwrap_lightmap(static)
    settings = bake.BakeSettings(size=args.size, samples=args.samples, exposure=args.exposure, denoise=not args.no_denoise)
    lightmap = out / f"{args.level}.lightmap.png"
    if args.no_bake:
        stats = bake.write_flat_lightmap(lightmap, settings)
    else:
        image = bake.bake_irradiance(static, settings)
        if settings.denoise:
            image = bake.denoise(image)
        stats = bake.encode_lightmap(image, lightmap, settings)

    export.finalize_for_export()
    export.merge_role("screens", "screens")
    export.merge_role("glow", "glow")
    export.export_glb(out / f"{args.level}.raw.glb")
    (out / "stats.json").write_text(json.dumps({"level": args.level, "seconds": round(time.time() - started, 1), "lightmap": stats}, indent=2))
    print(f"built {args.level} in {time.time() - started:.1f}s; lightmap {stats}")


main()
```

`art/blender/render_preview.py`:
```python
"""Full Cycles render of a level from the site's camera, for review and calibration (no bake)."""
from __future__ import annotations

import argparse
import importlib
import math
import sys
from pathlib import Path

ART = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ART / "blender"))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

from towerlib.core.args import script_args  # noqa: E402
from towerlib.core.camera import camera_pose  # noqa: E402
from towerlib.core.coords import to_blender  # noqa: E402
from towerlib.core.spec import load_context  # noqa: E402
from towerlib.kit.scene import reset_scene  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--level", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--width", type=int, default=900)
    parser.add_argument("--height", type=int, default=1200)
    parser.add_argument("--samples", type=int, default=64)
    parser.add_argument("--exposure", type=float, default=1.0)
    args = parser.parse_args(script_args(sys.argv))

    reset_scene()
    ctx = load_context(ART)
    importlib.import_module(f"levels.{args.level.replace('-', '_')}").build(ctx)

    # The level is built at its local origin, so the lift-0 pose frames it exactly like the site does.
    position, target = camera_pose(0.0, args.width, args.height, ctx.tower)
    data = bpy.data.cameras.new("preview")
    data.lens_unit = "FOV"
    data.sensor_fit = "VERTICAL"
    data.angle_y = math.radians(ctx.tower["camera"]["fovDeg"])
    camera = bpy.data.objects.new("preview", data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = Vector(to_blender(position))
    camera.rotation_euler = (Vector(to_blender(target)) - camera.location).to_track_quat("-Z", "Y").to_euler()

    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x = args.width
    scene.render.resolution_y = args.height
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = math.log2(args.exposure)
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = args.out
    bpy.ops.render.render(write_still=True)


main()
```

`art/blender/render_matcap.py`:
```python
"""Renders the matcap for moving objects: a white sphere lit by the level rig, seen from the site camera."""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

ART = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ART / "blender"))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

from towerlib import rig  # noqa: E402
from towerlib.core.args import script_args  # noqa: E402
from towerlib.core.coords import to_blender  # noqa: E402
from towerlib.core.spec import load_context  # noqa: E402
from towerlib.kit import primitives  # noqa: E402
from towerlib.kit.scene import reset_scene  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    parser.add_argument("--size", type=int, default=256)
    parser.add_argument("--samples", type=int, default=128)
    parser.add_argument("--exposure", type=float, default=1.0)
    args = parser.parse_args(script_args(sys.argv))

    reset_scene()
    ctx = load_context(ART)
    primitives.sphere("matcap-sphere", radius=1.0, color=(1.0, 1.0, 1.0), segments=64, role="dyn")
    rig.daylight()

    yaw = math.radians(ctx.tower["camera"]["yawDeg"])
    pitch = math.radians(ctx.tower["camera"]["pitchDeg"])
    direction = (math.sin(yaw) * math.cos(pitch), math.sin(pitch), math.cos(yaw) * math.cos(pitch))
    data = bpy.data.cameras.new("matcap")
    data.type = "ORTHO"
    data.ortho_scale = 2.0
    camera = bpy.data.objects.new("matcap", data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = Vector(to_blender(tuple(c * 10.0 for c in direction)))
    camera.rotation_euler = (Vector((0.0, 0.0, 0.0)) - camera.location).to_track_quat("-Z", "Y").to_euler()

    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x = args.size
    scene.render.resolution_y = args.size
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = math.log2(args.exposure)
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = args.out
    bpy.ops.render.render(write_still=True)


main()
```

- [ ] **Step 5: Тест и сборка тестовой комнаты**

Run: `pnpm vitest run art/scripts/build-args.test.ts`
Expected: PASS.

Run: `pnpm art:build test-room --draft`
Expected: таблица с `shipped: false`, треугольниками и размерами, код выхода 0. Файлы в `art/out/test-room/final/`.

Run: `pnpm art:preview test-room` и `pnpm art:matcap`
Expected: `art/out/test-room/preview.png` и `src/assets/textures/matcap.webp`. Открыть оба PNG и посмотреть: комната светлая, робот виден, matcap — мягко освещённая сфера со светом сверху-слева.

- [ ] **Step 6: Детерминизм (Review Focus 2)**

Run: `pnpm art:build test-room --no-bake` дважды подряд.
Expected: одинаковое значение `glb sha256` в обеих таблицах. Если отличается — найти источник (порядок объектов, время в метаданных) и убрать его до коммита.

- [ ] **Step 7: Commit**

```bash
git add art/blender/build_level.py art/blender/render_preview.py art/blender/render_matcap.py art/blender/levels art/scripts/build-args.ts art/scripts/build-args.test.ts art/scripts/build.ts art/scripts/preview.ts art/scripts/matcap.ts src/assets/textures/matcap.webp package.json
git commit -m "feat(art): build, preview and matcap commands for tower levels"
```

---

### Task 10: Этажи из GLB на сайте

**Files:**
- Create: `src/engine/materials/baked.ts`, `src/engine/materials/shared.ts`, `src/engine/glb-level.ts`, `src/engine/glb-source.ts`, `src/engine/assets.ts`
- Modify: `src/engine/app.ts` (источник этажей по умолчанию, общие материалы, `sources` в отладке)
- Test: `src/engine/materials/baked.test.ts`, `src/engine/glb-level.test.ts`, `src/engine/glb-source.test.ts`

**Interfaces:**
- Consumes: `LevelAsset`, `LevelSource`, `disposeObject3D`, `withFallback`, `greyboxSource` (план 01); `levelBaseY`, `tower` (план 01).
- Produces: `LIGHTMAP_HEADROOM = 2`, `createBakedMaterial(lightMap): ShaderMaterial`; `interface SharedTextures { matcap; screens; faces }`, `interface SharedMaterials { matcap; screens; glow; faces; keep: ReadonlySet<object> }`, `createSharedMaterials(textures)`, `whiteTexture()`, `loadSharedTextures(urls, loader?)`; `prepareLevel(root, baked, shared): { anchors; hits }`; `interface LevelFiles { glb; lightmap }`, `levelFilesFromGlob(urls)`, `interface GlbLoaders`, `createGlbSource(files, shared, loaders?, cfg?)`; `levelFiles`, `textureUrl(name)`.

- [ ] **Step 1: Написать падающие тесты**

`src/engine/materials/baked.test.ts`:
```ts
import { Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { createBakedMaterial, LIGHTMAP_HEADROOM } from './baked';

describe('createBakedMaterial', () => {
  it('multiplies vertex albedo by the lightmap with headroom', () => {
    const lightMap = new Texture();
    const material = createBakedMaterial(lightMap);
    expect(material.vertexColors).toBe(true);
    expect(material.uniforms.uLightMap?.value).toBe(lightMap);
    expect(material.uniforms.uHeadroom?.value).toBe(LIGHTMAP_HEADROOM);
    expect(material.fragmentShader).toContain('vAlbedo * light');
    expect(material.fragmentShader).toContain('colorspace_fragment');
  });
});
```

`src/engine/glb-level.test.ts`:
```ts
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, ShaderMaterial, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { prepareLevel } from './glb-level';
import { createSharedMaterials } from './materials/shared';

function tree() {
  const root = new Group();
  const add = (name: string, mesh = true) => {
    const node = mesh ? new Mesh(new BoxGeometry(), new MeshBasicMaterial()) : new Object3D();
    node.name = name;
    root.add(node);
    return node;
  };
  ['static', 'screens', 'glow', 'dyn__op-1__head', 'dyn__op-1__face', 'hit__phone'].forEach((n) => add(n));
  add('anchor__capsule-in', false);
  return root;
}

describe('prepareLevel', () => {
  const shared = createSharedMaterials({ matcap: new Texture(), screens: new Texture(), faces: new Texture() });
  const baked = new ShaderMaterial();

  it('assigns materials by node name', () => {
    const root = tree();
    prepareLevel(root, baked, shared);
    const material = (name: string) => (root.getObjectByName(name) as Mesh).material;
    expect(material('static')).toBe(baked);
    expect(material('screens')).toBe(shared.screens);
    expect(material('glow')).toBe(shared.glow);
    expect(material('dyn__op-1__head')).toBe(shared.matcap);
    expect(material('dyn__op-1__face')).toBe(shared.faces);
  });

  it('collects anchors without their prefix and hides hit boxes', () => {
    const root = tree();
    const { anchors, hits } = prepareLevel(root, baked, shared);
    expect(anchors.get('capsule-in')?.name).toBe('anchor__capsule-in');
    expect(hits.map((h) => h.name)).toEqual(['hit__phone']);
    expect(hits[0]?.visible).toBe(false);
  });
});
```

`src/engine/glb-source.test.ts`:
```ts
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, type Object3D, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { tower } from './config';
import { createGlbSource, type GlbLoaders, levelFilesFromGlob } from './glb-source';
import { greyboxSource } from './greybox';
import { withFallback } from './level-asset';
import { createSharedMaterials } from './materials/shared';

const shared = createSharedMaterials({ matcap: new Texture(), screens: new Texture(), faces: new Texture() });

function loaders(scene: () => Object3D = () => {
  const root = new Group();
  const statik = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
  statik.name = 'static';
  root.add(statik);
  return root;
}): GlbLoaders {
  return {
    loadGltf: async () => ({ scene: scene() }),
    loadTexture: async () => new Texture(),
  };
}

describe('levelFilesFromGlob', () => {
  it('pairs GLB files with their lightmaps and skips incomplete pairs', () => {
    const files = levelFilesFromGlob({
      '../assets/levels/agents.glb': '/_astro/agents.123.glb',
      '../assets/levels/agents.lightmap.webp': '/_astro/agents.lightmap.456.webp',
      '../assets/levels/crm.glb': '/_astro/crm.789.glb',
    });
    expect(files.get('agents')).toEqual({
      glb: '/_astro/agents.123.glb',
      lightmap: '/_astro/agents.lightmap.456.webp',
    });
    expect(files.has('crm')).toBe(false);
  });
});

describe('createGlbSource', () => {
  const files = new Map([['agents', { glb: 'a.glb', lightmap: 'a.webp' }]]);

  it('builds a positioned level with the baked material', async () => {
    const asset = await createGlbSource(files, shared, loaders())(1, new AbortController().signal);
    expect(asset.root.name).toBe('level.agents');
    expect(asset.root.position.y).toBe(-tower.level.height);
    expect(asset.root.userData.source).toBe('glb');
  });

  it('rejects levels that were not built yet', async () => {
    await expect(createGlbSource(files, shared, loaders())(2, new AbortController().signal)).rejects.toThrow(
      /no built assets/,
    );
  });

  it('falls back to the greybox for a missing level', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const source = withFallback(createGlbSource(files, shared, loaders()), greyboxSource);
    const asset = await source(2, new AbortController().signal);
    expect(asset.root.name).toBe('level.crm');
    expect(asset.root.userData.source).toBeUndefined();
    warn.mockRestore();
  });

  it('throws away a level that finished loading after an abort', async () => {
    const controller = new AbortController();
    const promise = createGlbSource(files, shared, loaders())(1, controller.signal);
    controller.abort();
    await expect(promise).rejects.toThrow(/aborted/);
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что падают**

Run: `pnpm vitest run src/engine/materials src/engine/glb-level.test.ts src/engine/glb-source.test.ts`
Expected: FAIL — модулей нет.

- [ ] **Step 3: Реализация**

`src/engine/materials/baked.ts`:
```ts
import { ShaderMaterial, type Texture } from 'three';

/** Lightmaps store irradiance / headroom so that light up to 2x the palette brightness fits in 8 bits. */
export const LIGHTMAP_HEADROOM = 2;

/** Unlit material for static geometry: vertex albedo × baked light. No real-time lighting. */
export function createBakedMaterial(lightMap: Texture): ShaderMaterial {
  return new ShaderMaterial({
    vertexColors: true,
    uniforms: {
      uLightMap: { value: lightMap },
      uHeadroom: { value: LIGHTMAP_HEADROOM },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vAlbedo;
      void main() {
        vUv = uv;
        #if defined( USE_COLOR_ALPHA )
          vAlbedo = color.rgb;
        #elif defined( USE_COLOR )
          vAlbedo = color;
        #else
          vAlbedo = vec3( 1.0 );
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uLightMap;
      uniform float uHeadroom;
      varying vec2 vUv;
      varying vec3 vAlbedo;
      void main() {
        vec3 light = texture2D( uLightMap, vUv ).rgb * uHeadroom;
        gl_FragColor = vec4( vAlbedo * light, 1.0 );
        #include <colorspace_fragment>
      }
    `,
  });
}
```

`src/engine/materials/shared.ts`:
```ts
import {
  DataTexture,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  RGBAFormat,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from 'three';

export interface SharedTextures {
  matcap: Texture;
  screens: Texture;
  faces: Texture;
}

export interface SharedMaterials {
  matcap: MeshMatcapMaterial;
  screens: MeshBasicMaterial;
  glow: MeshBasicMaterial;
  faces: MeshBasicMaterial;
  /** Resources shared by all levels: never disposed together with one level. */
  keep: ReadonlySet<object>;
}

export function createSharedMaterials(textures: SharedTextures): SharedMaterials {
  const matcap = new MeshMatcapMaterial({ matcap: textures.matcap, vertexColors: true });
  const screens = new MeshBasicMaterial({ map: textures.screens });
  const glow = new MeshBasicMaterial({ vertexColors: true });
  const faces = new MeshBasicMaterial({ map: textures.faces });
  const keep = new Set<object>([matcap, screens, glow, faces, textures.matcap, textures.screens, textures.faces]);
  return { matcap, screens, glow, faces, keep };
}

export function whiteTexture(): Texture {
  const texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

/** Atlases use glTF UVs (flipY = false); the matcap is a regular image (flipY = true). */
export async function loadSharedTextures(
  urls: { matcap?: string; screens?: string; faces?: string },
  loader: Pick<TextureLoader, 'loadAsync'> = new TextureLoader(),
): Promise<SharedTextures> {
  const load = async (url: string | undefined, flipY: boolean): Promise<Texture> => {
    if (!url) return whiteTexture();
    try {
      const texture = await loader.loadAsync(url);
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = flipY;
      texture.needsUpdate = true;
      return texture;
    } catch (error) {
      console.warn('[tower] shared texture failed, using white', url, error);
      return whiteTexture();
    }
  };
  const [matcap, screens, faces] = await Promise.all([
    load(urls.matcap, true),
    load(urls.screens, false),
    load(urls.faces, false),
  ]);
  return { matcap, screens, faces };
}
```

`src/engine/glb-level.ts`:
```ts
import type { Material, Mesh, Object3D } from 'three';
import type { SharedMaterials } from './materials/shared';

/** Assigns runtime materials by node name (contract 3.2) and collects anchors and hit boxes. */
export function prepareLevel(
  root: Object3D,
  baked: Material,
  shared: SharedMaterials,
): { anchors: Map<string, Object3D>; hits: Object3D[] } {
  const anchors = new Map<string, Object3D>();
  const hits: Object3D[] = [];
  root.traverse((node) => {
    const name = node.name;
    if (name.startsWith('anchor__')) {
      anchors.set(name.slice('anchor__'.length), node);
      return;
    }
    if (name.startsWith('hit__')) {
      node.visible = false;
      hits.push(node);
      return;
    }
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    if (name === 'static') mesh.material = baked;
    else if (name === 'screens') mesh.material = shared.screens;
    else if (name === 'glow') mesh.material = shared.glow;
    else if (name.startsWith('dyn__') && name.endsWith('__face')) mesh.material = shared.faces;
    else if (name.startsWith('dyn__')) mesh.material = shared.matcap;
  });
  return { anchors, hits };
}
```

`src/engine/glb-source.ts`:
```ts
import { type Object3D, SRGBColorSpace, type Texture, TextureLoader } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { levelBaseY, type TowerConfig, tower } from './config';
import { prepareLevel } from './glb-level';
import { disposeObject3D, type LevelSource } from './level-asset';
import { createBakedMaterial } from './materials/baked';
import type { SharedMaterials } from './materials/shared';

export interface LevelFiles {
  glb: string;
  lightmap: string;
}

/** Pairs '<id>.glb' with '<id>.lightmap.webp' from an import.meta.glob result. */
export function levelFilesFromGlob(urls: Record<string, string>): Map<string, LevelFiles> {
  const glbs = new Map<string, string>();
  const lightmaps = new Map<string, string>();
  for (const [path, url] of Object.entries(urls)) {
    const file = path.split('/').pop() ?? '';
    const lightmap = /^([a-z0-9-]+)\.lightmap\.webp$/.exec(file);
    const glb = /^([a-z0-9-]+)\.glb$/.exec(file);
    if (lightmap?.[1]) lightmaps.set(lightmap[1], url);
    else if (glb?.[1]) glbs.set(glb[1], url);
  }
  const files = new Map<string, LevelFiles>();
  for (const [id, glb] of glbs) {
    const lightmap = lightmaps.get(id);
    if (lightmap) files.set(id, { glb, lightmap });
  }
  return files;
}

export interface GlbLoaders {
  loadGltf(url: string): Promise<{ scene: Object3D }>;
  loadTexture(url: string): Promise<Texture>;
}

export function defaultLoaders(): GlbLoaders {
  const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const textures = new TextureLoader();
  return { loadGltf: (url) => gltf.loadAsync(url), loadTexture: (url) => textures.loadAsync(url) };
}

export function createGlbSource(
  files: ReadonlyMap<string, LevelFiles>,
  shared: SharedMaterials,
  loaders: GlbLoaders = defaultLoaders(),
  cfg: TowerConfig = tower,
): LevelSource {
  return async (index, signal) => {
    const id = cfg.levels[index]?.id;
    const entry = id ? files.get(id) : undefined;
    if (!id || !entry) throw new Error(`no built assets for level ${id ?? index}`);
    const [gltf, lightmap] = await Promise.all([loaders.loadGltf(entry.glb), loaders.loadTexture(entry.lightmap)]);
    const root = gltf.scene;
    if (signal.aborted) {
      disposeObject3D(root, shared.keep);
      lightmap.dispose();
      throw new Error(`level ${id} aborted`);
    }
    lightmap.colorSpace = SRGBColorSpace;
    lightmap.flipY = false;
    lightmap.needsUpdate = true;
    root.name = `level.${id}`;
    root.position.y = levelBaseY(index, cfg);
    root.userData.source = 'glb';
    const baked = createBakedMaterial(lightmap);
    const { anchors, hits } = prepareLevel(root, baked, shared);
    return {
      root,
      anchors,
      hits,
      dispose: () => {
        disposeObject3D(root, shared.keep);
        baked.dispose();
        lightmap.dispose();
      },
    };
  };
}
```

`src/engine/assets.ts`:
```ts
import { type LevelFiles, levelFilesFromGlob } from './glb-source';

const levelUrls = import.meta.glob('../assets/levels/*.{glb,webp}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const textureUrls = import.meta.glob('../assets/textures/*.webp', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const levelFiles: ReadonlyMap<string, LevelFiles> = levelFilesFromGlob(levelUrls);

export function textureUrl(name: 'matcap' | 'screens' | 'faces'): string | undefined {
  return textureUrls[`../assets/textures/${name}.webp`];
}
```

`src/engine/app.ts` — изменения:

1. Импорты:
```ts
import { levelFiles, textureUrl } from './assets';
import { createGlbSource } from './glb-source';
import { withFallback } from './level-asset';
import { createSharedMaterials, loadSharedTextures } from './materials/shared';
```

2. Перед `const loop = new RenderLoop(renderFrame);`:
```ts
  const shared = createSharedMaterials(
    await loadSharedTextures({
      matcap: textureUrl('matcap'),
      screens: textureUrl('screens'),
      faces: textureUrl('faces'),
    }),
  );
  const source = options.source ?? withFallback(createGlbSource(levelFiles, shared), greyboxSource);
```

3. В конструкторе `LevelManager` заменить `options.source ?? greyboxSource` на `source`.

4. В `TowerDebug` добавить поле, а в объект `window.__tower` — геттер:
```ts
  readonly sources: Record<number, string>;
```
```ts
      get sources() {
        return Object.fromEntries(
          levels.ready().map((i) => [i, String(levels.asset(i)?.root.userData.source ?? 'greybox')]),
        );
      },
```

5. В `destroy()` после `levels.dispose();`:
```ts
      for (const item of shared.keep) (item as { dispose?: () => void }).dispose?.();
```

- [ ] **Step 4: Запустить и убедиться, что проходят**

Run: `pnpm vitest run src/engine`
Expected: PASS — и новые тесты, и все тесты плана 01.

Run: `pnpm build && pnpm budgets && pnpm e2e tests/e2e/engine.spec.ts`
Expected: бюджеты выполнены (GLTFLoader и декодер Meshopt — в ленивом бандле), e2e зелёные. Этажей ещё нет, поэтому всё — «серая коробка» через фолбэк.

- [ ] **Step 5: Commit**

```bash
git add src/engine
git commit -m "feat(engine): load baked GLB levels with greybox fallback"
```

---

### Task 11: Эталонный этаж «Диспетчерская», режим кадра и сверка

**Files:**
- Create: `art/blender/levels/agents.py`, `art/scripts/compare-lib.ts`, `art/scripts/compare.ts`
- Modify: `src/engine/camera-rig.ts` (`setCentered`), `src/engine/boot.ts` и `src/engine/app.ts` (режим `?shot=`), `src/styles/global.css` (скрыть интерфейс в режиме кадра)
- Generated: `src/assets/levels/agents.glb`, `src/assets/levels/agents.lightmap.webp`
- Test: `art/scripts/compare-lib.test.ts`, дополнения в `src/engine/camera-rig.test.ts`, `tests/e2e/shot.spec.ts`

**Interfaces:**
- Produces: `CameraRig.setCentered(centered: boolean)`; `StartOptions.shot?: number`; `html[data-shot]`, `html[data-shot-ready="true"]`; `interface RawImage`, `gridLuminanceDiff(a, b, grid = 3): number[]`; команда `pnpm art:compare <level>`.

- [ ] **Step 1: Написать падающие тесты**

`art/scripts/compare-lib.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { gridLuminanceDiff, type RawImage } from './compare-lib';

function solid(width: number, height: number, value: number): RawImage {
  return { data: new Uint8Array(width * height * 3).fill(value), width, height, channels: 3 };
}

describe('gridLuminanceDiff', () => {
  it('is zero for identical images', () => {
    expect(gridLuminanceDiff(solid(30, 30, 128), solid(30, 30, 128))).toEqual(Array(9).fill(0));
  });

  it('only reports the cell that changed', () => {
    const changed = solid(30, 30, 128);
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 10; x += 1) changed.data.fill(0, (y * 30 + x) * 3, (y * 30 + x) * 3 + 3);
    }
    const diffs = gridLuminanceDiff(solid(30, 30, 128), changed);
    expect(diffs[0]).toBeGreaterThan(0.4);
    expect(diffs.slice(1).every((d) => d === 0)).toBe(true);
  });

  it('refuses images of different sizes', () => {
    expect(() => gridLuminanceDiff(solid(30, 30, 0), solid(20, 30, 0))).toThrow(/size/);
  });
});
```

Добавить в `src/engine/camera-rig.test.ts`:
```ts
  it('drops the view offset in centered (shot) mode', () => {
    const rig = new CameraRig(tower, viewport);
    expect(rig.camera.view?.enabled).toBe(true);
    rig.setCentered(true);
    expect(rig.camera.view?.enabled ?? false).toBe(false);
  });
```

`tests/e2e/shot.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { towerState } from './tower';

test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL runs on SwiftShader in Chromium');

test('shot mode frames one level and hides the interface', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1200 });
  await page.goto('/?shot=agents');
  await expect(page.locator('html')).toHaveAttribute('data-shot-ready', 'true', { timeout: 30_000 });
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.cta')).toBeHidden();
});

test('the agents floor is loaded from its GLB, the others fall back to the greybox', async ({ page }) => {
  await page.goto('/?tier=lite&debug=1#agents');
  await expect(page.locator('#stage')).toHaveAttribute('data-state', 'live');
  const sources = await page.evaluate(
    () => (window as unknown as { __tower?: { sources: Record<number, string> } }).__tower?.sources,
  );
  expect(sources?.[1]).toBe('glb');
  expect(sources?.[2]).toBe('greybox');
  expect((await towerState(page))?.drawCalls).toBeLessThanOrEqual(60);
});
```

- [ ] **Step 2: Запустить и убедиться, что падают**

Run: `pnpm vitest run art/scripts/compare-lib.test.ts src/engine/camera-rig.test.ts`
Expected: FAIL — нет `./compare-lib` и метода `setCentered`.

- [ ] **Step 3: Режим кадра**

`src/engine/camera-rig.ts` — добавить поля, метод и ветку в `resize`:
```ts
  private centered = false;
  private viewport: Viewport;
```
В конструкторе перед `this.resize(viewport)`: `this.viewport = viewport;`.
Метод:
```ts
  /** Shot mode: no view offset, the level is centered (posters and calibration). */
  setCentered(centered: boolean): void {
    this.centered = centered;
    this.resize(this.viewport);
  }
```
В начале `resize`: `this.viewport = viewport;`. Вызов `setViewOffset(...)` обернуть:
```ts
    if (this.centered) this.camera.clearViewOffset();
    else
      this.camera.setViewOffset(width, height, this.framing.viewOffsetX, this.framing.viewOffsetY, width, height);
```

`src/engine/app.ts`:
- в `StartOptions` добавить `shot?: number;`;
- сразу после создания `rig`:
```ts
  if (options.shot !== undefined) {
    rig.setCentered(true);
    rig.setGoal(options.shot, true);
  }
```
- в `onScroll` первой строкой: `if (options.shot !== undefined) return;`;
- в `renderFrame` после установки `stage.dataset.state = 'live'` — пометить кадр готовым через два кадра:
```ts
      if (options.shot !== undefined) {
        loop.invalidate(2);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            document.documentElement.dataset.shotReady = 'true';
          }),
        );
      }
```
- `lastGoal` в режиме кадра инициализировать значением `options.shot`: заменить строку на
```ts
  let lastGoal = options.shot ?? liftPosition(window.scrollY, travels);
```

`src/engine/boot.ts` — добавить импорт `import { tower } from './config';` и заменить в `boot()` строку `const forced = parseTierOverride(window.location.search);` на:
```ts
  const shotId = params.get('shot');
  const shotIndex = tower.levels.findIndex((level) => level.id === shotId);
  const shot = shotIndex >= 0 ? shotIndex : undefined;
  if (shot !== undefined && shotId) document.documentElement.dataset.shot = shotId;
  // A shot is a still frame: forced high tier, no FPS probe, no debug overlay, no ambient motion.
  const forced = shot !== undefined ? 'high' : parseTierOverride(window.location.search);
```
и вызов `startTower` — на:
```ts
    handle = await startTower({
      stage,
      tier,
      motion: shot !== undefined ? { camera: 'cut', ambient: false } : motion,
      probeFps: forced === null,
      debug: shot === undefined && params.has('debug'),
      shot,
      onFallback: () => {
        handle?.destroy();
        setTier('static');
      },
    });
```

`src/styles/global.css`:
```css
html[data-shot] .topbar,
html[data-shot] .elevator,
html[data-shot] .cta,
html[data-shot] .tower {
  display: none;
}
```

- [ ] **Step 4: Сверка Blender ↔ сайт**

`art/scripts/compare-lib.ts`:
```ts
export interface RawImage {
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
}

function meanLuminance(image: RawImage, x0: number, y0: number, x1: number, y1: number): number {
  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * image.width + x) * image.channels;
      sum += 0.2126 * (image.data[i] ?? 0) + 0.7152 * (image.data[i + 1] ?? 0) + 0.0722 * (image.data[i + 2] ?? 0);
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count / 255;
}

/** Absolute difference of mean luminance (0..1) per grid cell, row by row. */
export function gridLuminanceDiff(a: RawImage, b: RawImage, grid = 3): number[] {
  if (a.width !== b.width || a.height !== b.height) throw new Error('images differ in size');
  const diffs: number[] = [];
  for (let gy = 0; gy < grid; gy += 1) {
    for (let gx = 0; gx < grid; gx += 1) {
      const x0 = Math.floor((gx * a.width) / grid);
      const x1 = Math.floor(((gx + 1) * a.width) / grid);
      const y0 = Math.floor((gy * a.height) / grid);
      const y1 = Math.floor(((gy + 1) * a.height) / grid);
      diffs.push(Math.abs(meanLuminance(a, x0, y0, x1, y1) - meanLuminance(b, x0, y0, x1, y1)));
    }
  }
  return diffs;
}
```

`art/scripts/compare.ts`:
```ts
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { requireBlender, runBlender } from './blender.ts';
import { gridLuminanceDiff, type RawImage } from './compare-lib.ts';

const level = process.argv[2] ?? 'agents';
const base = process.env.BASE_URL ?? 'http://localhost:4321';
const width = 900;
const height = 1200;
const dir = join('art', 'out', level);
mkdirSync(dir, { recursive: true });
const preview = join(dir, 'preview.png');
const site = join(dir, 'site.png');

await runBlender(requireBlender(), [
  '--python', 'art/blender/render_preview.py', '--',
  '--level', level, '--out', preview, '--width', String(width), '--height', String(height),
]);

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(`${base}/?shot=${level}`);
await page.waitForSelector('html[data-shot-ready="true"]', { timeout: 60_000 });
await page.screenshot({ path: site });
await browser.close();

const raw = async (path: string): Promise<RawImage> => {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
};
const diffs = gridLuminanceDiff(await raw(preview), await raw(site));
await sharp({ create: { width: width * 2, height, channels: 3, background: '#000000' } })
  .composite([{ input: preview, left: 0, top: 0 }, { input: site, left: width, top: 0 }])
  .png()
  .toFile(join(dir, 'compare.png'));

const within = diffs.filter((d) => d <= 0.08).length;
console.log(diffs.map((d) => `${(d * 100).toFixed(1)}%`).join('  '));
console.log(`${within}/9 cells within 8% → ${within >= 7 ? 'OK' : 'NEEDS CALIBRATION'}; see ${join(dir, 'compare.png')}`);
process.exitCode = within >= 7 ? 0 : 1;
```

`package.json`:
```json
"art:compare": "tsx art/scripts/compare.ts"
```

- [ ] **Step 5: Сцена этажа**

`art/blender/levels/agents.py`:
```python
"""Floor 4 — AI agent dispatch room: operators answer chats, a sorter routes capsules, a giant phone hosts the live chat."""
from __future__ import annotations

from towerlib import rig
from towerlib.core.spec import BuildContext
from towerlib.kit import anchors, props, shell
from towerlib.kit.robot import RobotSpec, build_robot


def build(ctx: BuildContext) -> None:
    rig.daylight()
    shell.level_shell(ctx, kind="floor")
    shell.ceiling_occluder(ctx)
    shell.spine(ctx)

    # Three operators facing the camera; monitors turned toward the camera so screens read.
    operators = [("op-1", -4.4, -1.0, "chat-whatsapp"), ("op-2", -1.9, -1.0, "chat-telegram"), ("op-3", -3.2, 1.0, "chat-instagram")]
    for robot_id, x, z, screen in operators:
        props.desk(ctx, f"desk-{robot_id}", (x, 0.0, z))
        props.monitor(ctx, f"mon-{robot_id}", (x - 0.45, 0.74, z + 0.1), screen_id=screen, yaw_deg=28.0)
        build_robot(RobotSpec(id=robot_id, at=(x + 0.1, 0.0, z - 0.75), accessory="headset", activity="typing"), ctx)
        anchors.anchor(f"station-{robot_id}", (x, 1.2, z))

    # Giant phone on the back wall: the live chat hotspot.
    props.wall_phone(ctx, "phone", (0.6, 0.9, -2.85))

    # Sorter on the right: capsules drop from the ceiling and leave through colored outlets.
    props.sorter(ctx, "sorter", (3.4, 0.0, -0.6), yaw_deg=-15.0)
    props.pipe(ctx, "pipe-in", [(3.4, 3.6, -0.6), (3.4, 1.25, -0.6)], color="brass")
    props.pipe(ctx, "pipe-lead", [(3.05, 0.2, -0.05), (3.05, 0.2, 0.6), (5.0, 0.2, 0.6), (5.0, 1.2, 1.6)], color="mustard", radius=0.06)
    props.pipe(ctx, "pipe-support", [(3.4, 0.2, -0.1), (3.4, 0.6, 0.9), (5.0, 0.6, 1.4)], color="teal", radius=0.06)
    props.trash_bin(ctx, "spam-bin", (4.3, 0.0, 0.7))
    build_robot(RobotSpec(id="sorter", at=(2.2, 0.0, -0.2), yaw_deg=35.0, accessory="stamp", activity="sorting", accent="mustard"), ctx)

    # Life details.
    props.server_rack(ctx, "rack", (-5.35, 0.0, -2.35))
    props.coffee_counter(ctx, "coffee", (2.6, 0.0, -2.45))
    props.plant(ctx, "plant-1", (5.2, 0.0, -2.35))
    props.plant(ctx, "plant-2", (-5.3, 0.0, 1.9))
    for i, x in enumerate((-3.6, 0.0, 3.4)):
        props.ceiling_lamp(ctx, f"lamp-{i}", (x, 3.55, -0.6))
```

- [ ] **Step 6: Собрать, сверить, откалибровать**

1. Run: `pnpm art:build agents`
   Expected: таблица с `shipped: true`, треугольников < 60 000, GLB < 450 КБ, лайтмап < 250 КБ. Файлы в `src/assets/levels/`.
2. Run: `pnpm build && pnpm preview` (оставить запущенным), во втором терминале — `pnpm art:compare agents`.
   Expected: 9 процентов и итог. Открыть `art/out/agents/compare.png` и посмотреть глазами: слева Blender, справа сайт.
3. **Калибровка**, если итог `NEEDS CALIBRATION` или картинка заметно отличается:
   - Сайт темнее или светлее целиком → `--exposure` в `build_level.py` (по умолчанию 1.0), пересобрать.
   - Пересвет (в логе сборки `clipped` > 0.02) → уменьшить `sun_energy` в `rig.daylight()` или энергию ламп.
   - Роботы светлее или темнее окружения → `pnpm art:matcap` с `--exposure` (добавить в `matcap.ts`).
   - Шум на стенах → больше `--samples` или включить денойз.

   Каждую итерацию записывать в `docs/qa/device-matrix.md` (раздел «Калибровка»): параметры → результат.
4. Run: `pnpm vitest run art/scripts/built-levels.test.ts src/engine` и `pnpm e2e tests/e2e/shot.spec.ts tests/e2e/engine.spec.ts`
   Expected: PASS. В `__tower.sources` для уровня 1 — `glb`.

- [ ] **Step 7: Commit**

```bash
git add art/blender/levels/agents.py art/scripts/compare-lib.ts art/scripts/compare-lib.test.ts art/scripts/compare.ts src/engine src/styles/global.css src/assets/levels tests/e2e/shot.spec.ts docs/qa/device-matrix.md package.json
git commit -m "feat(art): build the agent dispatch floor and calibrate it against the site"
```

---

### Task 12: Роботы оживают

**Files:**
- Create: `src/engine/actors/robot-pose.ts`, `src/engine/actors/robot.ts`
- Modify: `src/engine/glb-source.ts` (создать актёров и `update` у этажа)
- Test: `src/engine/actors/robot-pose.test.ts`, `src/engine/actors/robot.test.ts`

**Interfaces:**
- Consumes: `FaceFrame`, `faceUvOffset` (задача 4); `SharedMaterials` (задача 10).
- Produces: `type RobotActivity = 'typing' | 'sorting' | 'idle'`, `interface RobotPose { hover; headYaw; headPitch; armL; armR; face: FaceFrame }`, `robotPose(timeSec, seed, activity)`, `parseActivity(value)`, `seedFrom(name)`; `class RobotActor { constructor(root, faces, seed); update(timeSec); dispose() }`, `findRobots(root): Object3D[]`.

- [ ] **Step 1: Написать падающие тесты**

`src/engine/actors/robot-pose.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseActivity, robotPose, seedFrom } from './robot-pose';

describe('robotPose', () => {
  it('is deterministic for the same time and seed', () => {
    expect(robotPose(3.21, 7, 'typing')).toEqual(robotPose(3.21, 7, 'typing'));
  });

  it('hovers within ±4 cm', () => {
    for (let t = 0; t < 20; t += 0.37) {
      expect(Math.abs(robotPose(t, 1, 'idle').hover)).toBeLessThanOrEqual(0.04 + 1e-12);
    }
  });

  it('blinks now and then but not all the time', () => {
    const faces = Array.from({ length: 400 }, (_, i) => robotPose(i * 0.05, 3, 'idle').face);
    const blinks = faces.filter((face) => face === 'blink').length;
    expect(blinks).toBeGreaterThan(0);
    expect(blinks).toBeLessThan(faces.length / 10);
  });

  it('raises both arms while typing', () => {
    const pose = robotPose(1, 2, 'typing');
    expect(pose.armL).toBeLessThan(-0.6);
    expect(pose.armR).toBeLessThan(-0.6);
  });
});

describe('parseActivity / seedFrom', () => {
  it('defaults unknown activities to idle', () => {
    expect(parseActivity('typing')).toBe('typing');
    expect(parseActivity('dancing')).toBe('idle');
    expect(parseActivity(undefined)).toBe('idle');
  });

  it('derives different stable seeds from names', () => {
    expect(seedFrom('dyn__op-1')).toBe(seedFrom('dyn__op-1'));
    expect(seedFrom('dyn__op-1')).not.toBe(seedFrom('dyn__op-2'));
  });
});
```

`src/engine/actors/robot.test.ts`:
```ts
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { findRobots, RobotActor } from './robot';

function robot(name = 'dyn__op-1') {
  const root = new Group();
  root.name = name;
  root.userData = { role: 'robot', activity: 'typing' };
  for (const part of ['body', 'head', 'arm-l', 'arm-r']) {
    const node = new Object3D();
    node.name = `${name}__${part}`;
    root.add(node);
  }
  const face = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
  face.name = `${name}__face`;
  root.getObjectByName(`${name}__head`)?.add(face);
  return root;
}

describe('RobotActor', () => {
  const faces = new MeshBasicMaterial({ map: new Texture() });

  it('moves the head and arms over time', () => {
    const root = robot();
    const actor = new RobotActor(root, faces, 1);
    actor.update(0.5);
    const armBefore = root.getObjectByName('dyn__op-1__arm-l')?.rotation.x;
    actor.update(0.6);
    expect(root.getObjectByName('dyn__op-1__arm-l')?.rotation.x).not.toBe(armBefore);
  });

  it('gives each robot its own face texture over the shared image', () => {
    const root = robot();
    new RobotActor(root, faces, 1);
    const face = root.getObjectByName('dyn__op-1__face') as Mesh;
    const material = face.material as MeshBasicMaterial;
    expect(material).not.toBe(faces);
    expect(material.map).not.toBe(faces.map);
    expect(material.map?.source).toBe(faces.map?.source);
  });
});

describe('findRobots', () => {
  it('finds robot roots by their extras', () => {
    const level = new Group();
    level.add(robot('dyn__op-1'), robot('dyn__op-2'));
    const prop = new Group();
    prop.name = 'dyn__lever';
    level.add(prop);
    expect(findRobots(level).map((r) => r.name)).toEqual(['dyn__op-1', 'dyn__op-2']);
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что падают**

Run: `pnpm vitest run src/engine/actors`
Expected: FAIL — модулей `./robot-pose` и `./robot` нет.

- [ ] **Step 3: Реализация**

`src/engine/actors/robot-pose.ts`:
```ts
import type { FaceFrame } from './faces';

export type RobotActivity = 'typing' | 'sorting' | 'idle';

export interface RobotPose {
  hover: number;
  headYaw: number;
  headPitch: number;
  armL: number;
  armR: number;
  face: FaceFrame;
}

export function parseActivity(value: unknown): RobotActivity {
  return value === 'typing' || value === 'sorting' ? value : 'idle';
}

/** Stable small number from a node name, so robots never move in sync. */
export function seedFrom(name: string): number {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 1000;
}

export function robotPose(timeSec: number, seed: number, activity: RobotActivity): RobotPose {
  const t = timeSec + seed * 1.7;
  const hover = 0.04 * Math.sin(t * 1.6);
  const blinking = t % 4.2 < 0.12;
  switch (activity) {
    case 'typing':
      return {
        hover,
        headYaw: 0.15 * Math.sin(t * 0.4),
        headPitch: -0.12,
        armL: -0.9 + 0.15 * Math.sin(t * 14),
        armR: -0.9 + 0.15 * Math.sin(t * 14 + Math.PI),
        face: blinking ? 'blink' : 'focus',
      };
    case 'sorting':
      return {
        hover,
        headYaw: 0.5 * Math.sin(t * 0.9),
        headPitch: -0.2,
        armL: -0.3 - 0.6 * Math.max(0, Math.sin(t * 2.2)),
        armR: -0.3,
        face: blinking ? 'blink' : 'happy',
      };
    default:
      return {
        hover,
        headYaw: 0.25 * Math.sin(t * 0.5),
        headPitch: 0,
        armL: -0.1,
        armR: -0.1,
        face: blinking ? 'blink' : 'neutral',
      };
  }
}
```

`src/engine/actors/robot.ts`:
```ts
import type { Mesh, MeshBasicMaterial, Object3D, Texture } from 'three';
import { faceUvOffset } from './faces';
import { parseActivity, type RobotActivity, robotPose } from './robot-pose';

/** Robot roots carry extras.role === 'robot' (set by the factory's build_robot). */
export function findRobots(root: Object3D): Object3D[] {
  const robots: Object3D[] = [];
  root.traverse((node) => {
    if (/^dyn__[a-z0-9-]+$/.test(node.name) && node.userData.role === 'robot') robots.push(node);
  });
  return robots;
}

export class RobotActor {
  private readonly root: Object3D;
  private readonly baseY: number;
  private readonly seed: number;
  private readonly activity: RobotActivity;
  private readonly head: Object3D | undefined;
  private readonly armL: Object3D | undefined;
  private readonly armR: Object3D | undefined;
  private readonly faceTexture: Texture | null;
  private readonly faceMaterial: MeshBasicMaterial | null;

  constructor(root: Object3D, faces: MeshBasicMaterial, seed: number) {
    this.root = root;
    this.baseY = root.position.y;
    this.seed = seed;
    this.activity = parseActivity(root.userData.activity);
    const part = (name: string) => root.getObjectByName(`${root.name}__${name}`);
    this.head = part('head');
    this.armL = part('arm-l');
    this.armR = part('arm-r');
    const face = part('face') as Mesh | undefined;
    if (face && faces.map) {
      // Clones share the image (Texture.source), so this costs no extra GPU memory.
      this.faceTexture = faces.map.clone();
      this.faceMaterial = faces.clone();
      this.faceMaterial.map = this.faceTexture;
      face.material = this.faceMaterial;
    } else {
      this.faceTexture = null;
      this.faceMaterial = null;
    }
  }

  update(timeSec: number): void {
    const pose = robotPose(timeSec, this.seed, this.activity);
    this.root.position.y = this.baseY + pose.hover;
    if (this.head) {
      this.head.rotation.y = pose.headYaw;
      this.head.rotation.x = pose.headPitch;
    }
    if (this.armL) this.armL.rotation.x = pose.armL;
    if (this.armR) this.armR.rotation.x = pose.armR;
    if (this.faceTexture) {
      const offset = faceUvOffset(pose.face);
      this.faceTexture.offset.set(offset.x, offset.y);
    }
  }

  dispose(): void {
    this.faceMaterial?.dispose();
    this.faceTexture?.dispose();
  }
}
```

`src/engine/glb-source.ts` — после `prepareLevel(...)`:
```ts
    const actors = findRobots(root).map((robot) => new RobotActor(robot, shared.faces, seedFrom(robot.name)));
```
В возвращаемом объекте добавить `update` и расширить `dispose`:
```ts
      update:
        actors.length > 0
          ? (timeSec: number) => {
              for (const actor of actors) actor.update(timeSec);
            }
          : undefined,
      dispose: () => {
        for (const actor of actors) actor.dispose();
        disposeObject3D(root, shared.keep);
        baked.dispose();
        lightmap.dispose();
      },
```
Импорты: `import { findRobots, RobotActor } from './actors/robot';`, `import { seedFrom } from './actors/robot-pose';`.

- [ ] **Step 4: Запустить и убедиться, что проходят**

Run: `pnpm vitest run src/engine`
Expected: PASS.

Run: `pnpm build && pnpm budgets && pnpm e2e`
Expected: всё зелёное. Вручную: `pnpm preview`, открыть `/?debug=1#agents` — роботы парят, печатают, моргают. При reduced motion (настройка ОС) роботы неподвижны.

- [ ] **Step 5: Commit**

```bash
git add src/engine
git commit -m "feat(engine): animate robots with hover, typing arms and blinking faces"
```

---

### Task 13: Ворота 02 — устройства, бюджеты, утверждение стиля

**Files:**
- Modify: `docs/qa/device-matrix.md` (раздел «Ворота 02»)

- [ ] **Step 1: Полная проверка**

Run: `pnpm verify && pnpm art:test`
Expected: всё зелёное.

- [ ] **Step 2: Прогон на устройствах**

Добавить в `docs/qa/device-matrix.md` раздел и заполнить его так же, как для ворот 01, на странице `/?debug=1#agents`:

```markdown
## Ворота 02 (этаж «Диспетчерская» из GLB)

| Устройство | Tier | FPS при скролле через этажи 0–2 | Draw calls (HUD) | Треугольники (HUD) | 3 прохода без вылета | Заметки |
|---|---|---|---|---|---|---|

**Критерии:** High-устройства 55–60 FPS; draw calls ≤ 60 при двух этажах в кадре; треугольники ≤ 120k; память на iPhone (Safari Web Inspector → Timelines → Memory) не растёт от прохода к проходу.

## Калибровка

| Дата | Параметры (exposure, sun, lamps, samples) | Итог art:compare | Комментарий |
|---|---|---|---|
```

- [ ] **Step 3: Утверждение стиля командой**

1. Отправить команде `art/out/agents/compare.png` и 2–3 скриншота с телефонов.
2. Правки палитры — в `art/palette.json`, затем `pnpm art:build agents` (2–5 минут) и повторный показ.
3. Правки расстановки — в `art/blender/levels/agents.py`, сборка и показ так же.

- [ ] **Step 4: Решение go / no-go**

- **Go:** критерии выполнены, команда утвердила стиль → пишется детальный план 03 (остальные этажи по этому же шаблону).
- **No-go после двух итераций калибровки:** запасной путь из брифа (3.12). Этажи без лайтмапа (`--no-bake`), matcap-свет на всей геометрии. Задача на доработку запекания уходит в план 03. Сайт не блокируется.

- [ ] **Step 5: Commit**

```bash
git add docs/qa/device-matrix.md art/palette.json src/assets
git commit -m "docs(qa): record gate 02 device run and style approval"
```
