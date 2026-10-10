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
