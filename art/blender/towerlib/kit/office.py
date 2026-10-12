"""Office furniture for floors where people sit. Builders take (ctx, name, at, ...) in three.js coordinates."""
from __future__ import annotations

from ..core.coords import Vec3, place
from ..core.spec import BuildContext
from .primitives import cylinder, rounded_box

#: Top of the seat. A cast member in the 'sit' / 'type' pose has their hips ~5 cm above their anchor.
SEAT_HEIGHT = 0.46
SEATED_ANCHOR_Y = SEAT_HEIGHT - 0.05


def office_chair(ctx: BuildContext, name: str, at: Vec3, *, color: str = "teal", yaw_deg: float = 0.0) -> list:
    """Swivel chair; at yaw 0 the sitter faces +Z (the backrest is on -Z)."""
    p = ctx.palette
    return [
        cylinder(f"{name}-base", radius=0.26, height=0.04, color=p["robot-dark"], at=at),
        cylinder(f"{name}-post", radius=0.035, height=SEAT_HEIGHT - 0.12, color=p["steel"], at=place((0.0, 0.04, 0.0), at, yaw_deg)),
        rounded_box(f"{name}-seat", (0.5, 0.08, 0.48), color=p[color], radius=0.04, at=place((0.0, SEAT_HEIGHT - 0.08, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-back", (0.46, 0.5, 0.08), color=p[color], radius=0.04, at=place((0.0, SEAT_HEIGHT + 0.02, -0.24), at, yaw_deg), yaw_deg=yaw_deg),
    ]


def keyboard(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    """Low keyboard on a desk top: keeps the typist's face visible from the camera."""
    p = ctx.palette
    return [
        rounded_box(f"{name}-body", (0.46, 0.025, 0.16), color=p["robot-dark"], radius=0.01, at=at, yaw_deg=yaw_deg),
        rounded_box(f"{name}-keys", (0.42, 0.01, 0.12), color=p["white"], radius=0.005, at=place((0.0, 0.025, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
    ]
