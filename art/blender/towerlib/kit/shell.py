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


def back_wall_z(ctx: BuildContext, gap: float = 0.035) -> float:
    """Z for things hung on the back wall: its inner face is WALL in front of -depth/2.

    The default gap clears a 6 cm wall-screen frame, centred on its z.
    """
    return -ctx.dims.depth / 2 + WALL + gap


def ceiling_occluder(ctx: BuildContext):
    """The slab of the level above: blocks sky light during the bake, removed before export."""
    d = ctx.dims
    return rounded_box("occluder-ceiling", (d.width, d.slab, d.depth), color=ctx.palette["slab"], radius=0.0, segments=0, role="occluders", at=(0.0, d.height - d.slab, 0.0))


def spine(ctx: BuildContext):
    """Vertical pneumatic tube running through every level at tower.tube.x/z."""
    t, d = ctx.tower["tube"], ctx.dims
    points = [(t["x"], -d.slab, t["z"]), (t["x"], d.height - d.slab, t["z"])]
    return tube("spine", points, radius=t["radius"], color=ctx.palette["brass"])
