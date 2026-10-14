import json
from pathlib import Path

from towerlib.core.spec import load_context
from towerlib.kit import shell

ART = Path(__file__).resolve().parents[2]


def _ctx():
    return load_context(ART)


def _colors(obj):
    attr = obj.data.color_attributes[0]
    return {tuple(round(c, 4) for c in item.color[:3]) for item in attr.data}



def test_side_walls_are_brick_with_mortar_joints():
    ctx = _ctx()
    parts = {p.name: p for p in shell.level_shell(ctx, kind="floor")}
    for side in ("left", "right"):
        wall = parts[f"shell-bricks-{side}"]
        colors = _colors(wall)
        mortar = tuple(round(c, 4) for c in ctx.palette["mortar"])
        assert mortar in colors
        assert len(colors) >= 3, "mortar plus at least two brick tones"
        assert len(wall.data.polygons) * 2 <= 4000


def test_the_wall_ends_facing_the_camera_are_brick_too():
    parts = {p.name for p in shell.level_shell(_ctx(), kind="floor")}
    assert {"shell-bricks-end-left", "shell-bricks-end-right"} <= parts


def test_brass_cornice_and_rivets_run_along_the_slab_front():
    ctx = _ctx()
    parts = {p.name: p for p in shell.level_shell(ctx, kind="floor")}
    cornice = parts["shell-cornice"]
    front = ctx.dims.depth / 2
    # Blender y is -z in three.js: the front of the slab is at Blender y = -depth/2.
    assert cornice.location.y < -front + 1e-3
    rivets = parts["shell-rivets"]
    shaft = json.loads((ART.parent / "scene" / "tower.json").read_text(encoding="utf-8"))["shaft"]
    shaft_front = shaft["z"] + shaft["depth"] / 2
    assert min(-(rivets.location.y + v.co.y) for v in rivets.data.vertices) > shaft_front


def test_roof_gets_brick_slab_ends_but_no_walls():
    parts = {p.name for p in shell.level_shell(_ctx(), kind="roof")}
    assert "shell-bricks-right" in parts and "shell-bricks-end-right" not in parts
    assert "shell-cornice" in parts
