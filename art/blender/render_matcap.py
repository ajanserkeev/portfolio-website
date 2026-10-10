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
    out = Path(args.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)


main()
