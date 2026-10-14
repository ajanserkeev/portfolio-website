"""Nothing on any floor may stand inside the lift shaft (scene/tower.json "shaft")."""
import importlib
import json
from pathlib import Path

import bpy
from mathutils import Vector

from towerlib.core.spec import load_context
from towerlib.kit.scene import reset_scene

ART = Path(__file__).resolve().parents[2]
LEVELS = ("roof", "agents", "crm", "booking", "workshop", "basement")
# The shell (floor, walls), the spine tube and bake helpers are allowed to touch the shaft.
ALLOWED = ("shell-", "occluder", "spine")


def _shaft_box():
    shaft = json.loads((ART.parent / "scene" / "tower.json").read_text(encoding="utf-8"))["shaft"]
    x0, x1 = shaft["x"] - shaft["width"] / 2, shaft["x"] + shaft["width"] / 2
    z0, z1 = shaft["z"] - shaft["depth"] / 2, shaft["z"] + shaft["depth"] / 2
    # three.js (x, z) -> Blender (x, -z)
    return (x0, x1), (-z1, -z0)


def test_no_prop_stands_in_the_lift_shaft():
    (bx0, bx1), (by0, by1) = _shaft_box()
    offenders = []
    for level in LEVELS:
        reset_scene()
        importlib.import_module(f"levels.{level}").build(load_context(ART))
        bpy.context.view_layer.update()
        for obj in bpy.data.objects:
            if obj.type != "MESH" or obj.name.startswith(ALLOWED) or obj.hide_render:
                continue
            xs, ys = [], []
            for corner in obj.bound_box:
                world = obj.matrix_world @ Vector(corner)
                xs.append(world.x)
                ys.append(world.y)
            if min(xs) < bx1 and max(xs) > bx0 and min(ys) < by1 and max(ys) > by0:
                offenders.append(f"{level}:{obj.name}")
    assert offenders == [], offenders
