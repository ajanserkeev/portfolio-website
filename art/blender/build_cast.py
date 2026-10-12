"""Builds art/out/cast/cast.raw.glb from art/cast.json and the vendored Kenney Mini Characters.

blender -b --factory-startup --python art/blender/build_cast.py -- --out art/out/cast/cast.raw.glb
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ART = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ART / "blender"))

import bpy  # noqa: E402

from towerlib.cast_rig import build_cast, export_cast  # noqa: E402
from towerlib.core.args import script_args  # noqa: E402
from towerlib.core.cast import load_cast  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    args = parser.parse_args(script_args(sys.argv))

    bpy.ops.wm.read_factory_settings(use_empty=True)
    spec = load_cast(ART / "cast.json", ART / "vendor" / "kenney-mini-characters")
    armatures = build_cast(spec)
    out = Path(args.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    export_cast(out)
    print(f"cast: {len(armatures)} members, clips {list(spec.clips)} -> {out}")


main()
