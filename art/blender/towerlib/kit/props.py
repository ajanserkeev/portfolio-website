"""Furniture and machines. Every builder takes (ctx, name, at, ...) in three.js coordinates."""
from __future__ import annotations

from ..core.coords import Vec3, place
from ..core.paths import round_corners
from ..core.spec import BuildContext
from ..rig import area_lamp
from .anchors import anchor, hitbox
from .primitives import cylinder, rounded_box, screen_plane, sphere, tube


def desk(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0, width: float = 1.5, depth: float = 0.75, height: float = 0.74) -> list:
    p, top = ctx.palette, 0.05
    parts = [rounded_box(f"{name}-top", (width, top, depth), color=p["wood"], radius=0.02, at=place((0.0, height - top, 0.0), at, yaw_deg), yaw_deg=yaw_deg)]
    for side, label in ((-1, "l"), (1, "r")):
        parts.append(rounded_box(f"{name}-leg-{label}", (0.06, height - top, depth * 0.85), color=p["steel"], radius=0.01, at=place((side * (width / 2 - 0.1), 0.0, 0.0), at, yaw_deg), yaw_deg=yaw_deg))
    return parts


def monitor(ctx: BuildContext, name: str, at: Vec3, *, screen_id: str, yaw_deg: float = 0.0, size: tuple[float, float] = (0.62, 0.38)) -> list:
    info = ctx.screens[screen_id]
    p, (w, h) = ctx.palette, size
    return [
        rounded_box(f"{name}-stand", (0.08, 0.2, 0.06), color=p["ink"], radius=0.01, at=place((0.0, 0.0, -0.06), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-body", (w + 0.05, h + 0.05, 0.04), color=p["ink"], radius=0.015, at=place((0.0, 0.18, -0.06), at, yaw_deg), yaw_deg=yaw_deg),
        screen_plane(f"screen-{name}", size, uv=info.rect, glow=info.glow, at=place((0.0, 0.205, -0.038), at, yaw_deg), yaw_deg=yaw_deg),
    ]


def server_rack(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0, height: float = 2.0, leds: int = 10) -> list:
    p = ctx.palette
    parts = [rounded_box(f"{name}-body", (0.7, height, 0.6), color=p["ink"], radius=0.03, at=at, yaw_deg=yaw_deg)]
    for i in range(leds):
        y = 0.25 + i * (height - 0.4) / max(1, leds - 1)
        color = p["signal"] if i % 3 == 0 else p["teal"]
        parts.append(rounded_box(f"{name}-led-{i}", (0.42, 0.035, 0.02), color=color, radius=0.0, segments=0, role="glow", at=place((0.0, y, 0.305), at, yaw_deg), yaw_deg=yaw_deg))
    return parts


def plant(ctx: BuildContext, name: str, at: Vec3) -> list:
    p = ctx.palette
    parts = [cylinder(f"{name}-pot", radius=0.18, height=0.32, color=p["signal"], at=at)]
    for i, (dx, dy, dz, r) in enumerate([(0.0, 0.55, 0.0, 0.22), (0.12, 0.72, 0.05, 0.16), (-0.1, 0.7, -0.06, 0.15)]):
        parts.append(sphere(f"{name}-leaf-{i}", radius=r, color=p["plant"], segments=16, at=(at[0] + dx, at[1] + dy, at[2] + dz)))
    return parts


def ceiling_lamp(ctx: BuildContext, name: str, at: Vec3, *, energy: float = 180.0) -> list:
    p = ctx.palette
    area_lamp(f"{name}-light", (at[0], at[1] - 0.05, at[2]), size=0.5, energy=energy)
    return [
        cylinder(f"{name}-shade", radius=0.32, height=0.08, color=p["ink"], at=at),
        cylinder(f"{name}-disc", radius=0.26, height=0.012, color=p["white"], role="glow", at=(at[0], at[1] - 0.012, at[2])),
    ]


def sorter(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    """Sorting machine: capsules drop into the hopper and leave through three colored outlets."""
    p = ctx.palette
    parts = [
        rounded_box(f"{name}-base", (1.2, 0.9, 0.8), color=p["steel"], radius=0.06, at=at, yaw_deg=yaw_deg),
        rounded_box(f"{name}-hopper", (0.5, 0.35, 0.5), color=p["brass"], radius=0.05, at=place((0.0, 0.9, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-panel", (0.5, 0.25, 0.02), color=p["ink"], radius=0.01, at=place((0.0, 0.45, 0.41), at, yaw_deg), yaw_deg=yaw_deg),
    ]
    for label, color, dx in (("lead", "mustard", -0.35), ("support", "teal", 0.0), ("spam", "signal", 0.35)):
        parts.append(cylinder(f"{name}-out-{label}", radius=0.08, height=0.2, color=p[color], at=place((dx, 0.0, 0.48), at, yaw_deg), yaw_deg=yaw_deg))
        anchor(f"capsule-{label}", place((dx, 0.3, 0.55), at, yaw_deg))
    anchor("capsule-in", place((0.0, 1.35, 0.0), at, yaw_deg))
    hitbox(name, (1.3, 1.4, 0.9), at, action="sort-demo", yaw_deg=yaw_deg)
    return parts


def trash_bin(ctx: BuildContext, name: str, at: Vec3) -> list:
    p = ctx.palette
    return [
        cylinder(f"{name}-bin", radius=0.22, height=0.5, color=p["signal"], at=at),
        cylinder(f"{name}-rim", radius=0.24, height=0.04, color=p["ink"], at=(at[0], at[1] + 0.5, at[2])),
    ]


def wall_phone(ctx: BuildContext, name: str, at: Vec3) -> list:
    """Giant phone on the back wall: the live chat hotspot."""
    info, p = ctx.screens["phone"], ctx.palette
    parts = [
        rounded_box(f"{name}-body", (1.1, 2.0, 0.12), color=p["ink"], radius=0.12, segments=3, at=at),
        screen_plane(f"screen-{name}", (0.96, 1.8), uv=info.rect, glow=info.glow, at=(at[0], at[1] + 0.1, at[2] + 0.062)),
    ]
    hitbox(name, (1.1, 2.0, 0.3), at, action="open-chat")
    anchor(f"{name}-screen", (at[0], at[1] + 1.0, at[2] + 0.07))
    return parts


def coffee_counter(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    p = ctx.palette
    return [
        rounded_box(f"{name}-counter", (1.2, 0.9, 0.6), color=p["wood"], radius=0.03, at=at, yaw_deg=yaw_deg),
        rounded_box(f"{name}-machine", (0.36, 0.42, 0.32), color=p["robot-dark"], radius=0.04, at=place((-0.25, 0.9, -0.05), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-light", (0.06, 0.06, 0.02), color=p["teal"], radius=0.0, segments=0, role="glow", at=place((-0.25, 1.2, 0.115), at, yaw_deg), yaw_deg=yaw_deg),
        cylinder(f"{name}-cup", radius=0.05, height=0.09, color=p["white"], at=place((0.2, 0.9, 0.05), at, yaw_deg)),
    ]


def pipe(ctx: BuildContext, name: str, points: list[Vec3], *, color: str = "brass", radius: float = 0.07) -> list:
    return [tube(name, round_corners(points, 0.25), radius=radius, color=ctx.palette[color])]
