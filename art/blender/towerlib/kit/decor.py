"""A floor's own tone: striped wallpaper over a wood wainscot with a brass rail, wall-to-wall carpet
with a border, and desk lamps. Colours come from the palette by name, so a floor's tone is data."""
from __future__ import annotations

from dataclasses import dataclass

from ..core.coords import Vec3
from ..core.spec import BuildContext
from ..rig import area_lamp
from .primitives import cylinder, face_grid, rounded_box, sphere

WALL = 0.2
WAINSCOT = 0.9
# Panels hang this far in front of the wall's inner face.
GAP = 0.006
STRIPE = (0.38, 0.12)
BORDER = 0.18


@dataclass(frozen=True)
class Tone:
    wall: str
    stripe: str
    floor: str
    border: str
    wainscot: str = "wood"
    rail: str = "brass"


TONES = {
    "agents": Tone(wall="wallpaper-teal", stripe="wallpaper-teal-dark", floor="carpet-teal", border="carpet-border"),
}


def _stripes(length: float) -> tuple[list[float], list[int]]:
    """Cell edges across `length` and which cells are stripes (1) or plain wall (0)."""
    edges, kinds, x = [0.0], [], 0.0
    while x < length - 1e-6:
        for width, kind in ((STRIPE[0], 0), (STRIPE[1], 1)):
            x = min(x + width, length)
            edges.append(x)
            kinds.append(kind)
            if x >= length - 1e-6:
                break
    return edges, kinds


def _wall(ctx: BuildContext, tone: Tone, side: str, length: float, at: Vec3, yaw_deg: float) -> list:
    p = ctx.palette
    edges, kinds = _stripes(length)
    xs = [x - length / 2 for x in edges]
    colors = [p[tone.stripe] if kind else p[tone.wall] for kind in kinds]
    height = ctx.dims.height - ctx.dims.slab - WAINSCOT
    x, _, z = at
    return [
        face_grid(f"shell-wallpaper-{side}", xs, [0.0, height], colors, at=(x, WAINSCOT, z), yaw_deg=yaw_deg),
        rounded_box(f"shell-wainscot-{side}", (length, WAINSCOT, 0.03), color=p[tone.wainscot], radius=0.008, segments=1, at=(x, 0.0, z), yaw_deg=yaw_deg),
        rounded_box(f"shell-rail-{side}", (length, 0.05, 0.045), color=p[tone.rail], radius=0.015, segments=1, at=(x, WAINSCOT - 0.03, z), yaw_deg=yaw_deg),
    ]


def room_tone(ctx: BuildContext, tone: Tone) -> list:
    d, p = ctx.dims, ctx.palette
    inner_x = d.width / 2 - WALL
    back = -d.depth / 2 + WALL
    side_length = d.depth / 2 - back
    side_z = (back + d.depth / 2) / 2
    parts = _wall(ctx, tone, "back", 2 * inner_x, (0.0, 0.0, back + GAP), 0.0)
    parts += _wall(ctx, tone, "left", side_length, (-inner_x + GAP, 0.0, side_z), 90.0)
    parts += _wall(ctx, tone, "right", side_length, (inner_x - GAP, 0.0, side_z), -90.0)
    xs = [-inner_x, -inner_x + BORDER, inner_x - BORDER, inner_x]
    zs = [back, back + BORDER, d.depth / 2 - BORDER, d.depth / 2]
    colors = [p[tone.floor] if (r, c) == (1, 1) else p[tone.border] for r in range(3) for c in range(3)]
    parts.append(face_grid("shell-carpet", xs, zs, colors, horizontal=True, at=(0.0, 0.004, 0.0)))
    return parts


def desk_lamp(ctx: BuildContext, name: str, at: Vec3, *, energy: float = 35.0) -> list:
    """Brass desk lamp standing at `at` (the desk top) with a warm glowing bulb under its shade."""
    p = ctx.palette
    x, y, z = at
    area_lamp(f"{name}-light", (x, y + 0.36, z), size=0.25, energy=energy)
    return [
        cylinder(f"{name}-base", radius=0.08, height=0.03, color=p["ink"], at=at),
        cylinder(f"{name}-stem", radius=0.012, height=0.34, color=p["brass"], segments=8, at=(x, y + 0.03, z)),
        cylinder(f"{name}-shade", radius=0.11, height=0.09, color=p["mustard"], at=(x, y + 0.37, z)),
        sphere(f"{name}-bulb", radius=0.045, color=p["white"], segments=12, role="glow", at=(x, y + 0.36, z)),
    ]
