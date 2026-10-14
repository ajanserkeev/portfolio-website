"""Facade frame: brick on the outer faces and ends of the side walls, a brass cornice and rivets
along the front of the slab. Bricks are face colours on one grid per wall (one lightmap island)."""
from __future__ import annotations

import bmesh
import bpy

from ..core.bricks import brick_grid, shade
from ..core.coords import Vec3
from ..core.spec import BuildContext
from .materials import ALBEDO
from .primitives import finish, rounded_box
from .scene import join

# Panels sit this far in front of the wall face, so they never z-fight with it.
OUT = 0.004
RIVET_STEP = 0.6


def brick_panel(ctx: BuildContext, name: str, size: tuple[float, float], *, at: Vec3, yaw_deg: float = 0.0) -> bpy.types.Object:
    """Vertical brick wall facing +Z (before `yaw_deg`), bottom edge at y=0, centred in x."""
    width, height = size
    p = ctx.palette
    tones = (p["brick"], p["brick-dark"], p["brick-light"])
    grid = brick_grid(width, height)
    bm = bmesh.new()
    rows = [[bm.verts.new((x - width / 2, 0.0, y)) for x in grid.xs] for y in grid.ys]
    colors = []
    for r in range(len(grid.ys) - 1):
        for c in range(len(grid.xs) - 1):
            bm.faces.new((rows[r][c], rows[r][c + 1], rows[r + 1][c + 1], rows[r + 1][c]))
            brick = grid.cell(c, r)
            colors.append(p["mortar"] if brick is None else tones[shade(brick)])
    obj = finish(name, bm, p["mortar"], at=at, yaw_deg=yaw_deg)
    flat = []
    for polygon, color in zip(obj.data.polygons, colors):
        flat += [*color, 1.0] * polygon.loop_total
    obj.data.color_attributes[ALBEDO].data.foreach_set("color", flat)
    return obj


def frame(ctx: BuildContext, *, kind: str, wall: float) -> list:
    d, p = ctx.dims, ctx.palette
    # A floor's brick runs from the bottom of its slab to the top of its walls; the roof has only its slab.
    height = d.slab if kind == "roof" else d.height
    parts = [
        brick_panel(ctx, "shell-bricks-right", (d.depth, height), at=(d.width / 2 + OUT, -d.slab, 0.0), yaw_deg=90.0),
        brick_panel(ctx, "shell-bricks-left", (d.depth, height), at=(-d.width / 2 - OUT, -d.slab, 0.0), yaw_deg=-90.0),
    ]
    if kind != "roof":
        for side, sign in (("right", 1.0), ("left", -1.0)):
            x = sign * (d.width / 2 - wall / 2)
            parts.append(brick_panel(ctx, f"shell-bricks-end-{side}", (wall, height), at=(x, -d.slab, d.depth / 2 + OUT)))
    front = d.depth / 2
    parts.append(rounded_box("shell-cornice", (d.width + 0.06, 0.09, 0.07), color=p["brass"], radius=0.02, at=(0.0, -0.09, front + 0.035)))
    count = int((d.width - 0.6) / RIVET_STEP) + 1
    start = -(count - 1) * RIVET_STEP / 2
    rivets = [
        rounded_box(f"shell-rivet-{i}", (0.06, 0.06, 0.03), color=p["brass"], radius=0.014, segments=1, at=(start + i * RIVET_STEP, -d.slab * 0.62, front + 0.015))
        for i in range(count)
    ]
    parts.append(join(rivets, "shell-rivets"))
    return parts
