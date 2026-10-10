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
    out = Path(args.out).resolve()
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
