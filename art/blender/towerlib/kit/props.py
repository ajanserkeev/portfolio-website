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


def antenna_mast(ctx: BuildContext, name: str, at: Vec3, *, height: float = 2.6) -> list:
    p = ctx.palette
    return [
        cylinder(f"{name}-base", radius=0.22, height=0.1, color=p["steel"], at=at),
        cylinder(f"{name}-pole", radius=0.04, height=height, color=p["steel"], at=(at[0], at[1] + 0.1, at[2])),
        cylinder(f"{name}-bar-1", radius=0.02, height=0.6, color=p["steel"], at=(at[0], at[1] + height * 0.6, at[2])),
        cylinder(f"{name}-bar-2", radius=0.02, height=0.4, color=p["steel"], at=(at[0], at[1] + height * 0.85, at[2])),
        sphere(f"{name}-beacon", radius=0.07, color=p["signal"], role="glow", at=(at[0], at[1] + height + 0.1, at[2])),
    ]


def satellite_dish(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    p = ctx.palette
    return [
        rounded_box(f"{name}-base", (0.6, 0.12, 0.6), color=p["steel"], radius=0.03, at=at, yaw_deg=yaw_deg),
        cylinder(f"{name}-post", radius=0.06, height=0.7, color=p["steel"], at=place((0.0, 0.12, 0.0), at, yaw_deg)),
        cylinder(f"{name}-dish", radius=0.5, height=0.08, color=p["white"], at=place((0.0, 0.8, -0.1), at, yaw_deg), yaw_deg=yaw_deg),
        sphere(f"{name}-feed", radius=0.07, color=p["signal"], at=place((0.0, 0.95, 0.2), at, yaw_deg)),
    ]


def vent_unit(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    p = ctx.palette
    return [
        rounded_box(f"{name}-body", (1.4, 0.9, 0.9), color=p["steel"], radius=0.04, at=at, yaw_deg=yaw_deg),
        cylinder(f"{name}-fan", radius=0.32, height=0.05, color=p["ink"], at=place((0.0, 0.9, 0.0), at, yaw_deg)),
        rounded_box(f"{name}-grill", (0.5, 0.4, 0.02), color=p["ink"], radius=0.01, at=place((0.0, 0.25, 0.46), at, yaw_deg), yaw_deg=yaw_deg),
    ]


def hopper(ctx: BuildContext, name: str, at: Vec3) -> list:
    p = ctx.palette
    anchor("hopper", (at[0], at[1] + 0.65, at[2]))
    return [
        cylinder(f"{name}-neck", radius=0.22, height=0.3, color=p["brass"], at=at),
        cylinder(f"{name}-funnel", radius=0.45, height=0.35, color=p["brass"], at=(at[0], at[1] + 0.3, at[2])),
    ]


def lever_prop(ctx: BuildContext, name: str, at: Vec3, *, action: str = "toggle-agent", yaw_deg: float = 0.0) -> list:
    import bpy
    from ..core.coords import to_blender
    from .scene import join, link

    p = ctx.palette
    parts = [
        rounded_box(f"{name}-base", (0.6, 0.35, 0.5), color=p["steel"], radius=0.03, at=at, yaw_deg=yaw_deg),
        rounded_box(f"{name}-slot", (0.1, 0.05, 0.3), color=p["ink"], radius=0.01, at=place((0.0, 0.35, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
    ]

    root = bpy.data.objects.new(f"dyn__{name}", None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = to_blender(place((0.0, 0.35, 0.0), at, yaw_deg))
    link(root, "dyn")

    arm = cylinder(f"dyn__{name}__handle", radius=0.035, height=0.48, color=p["steel"], role="dyn", at=(0.0, 0.0, 0.0), parent=root)
    knob = sphere(f"{name}-knob", radius=0.08, color=p["signal"], role="dyn", at=(0.0, 0.48, 0.0), parent=arm)
    join([arm, knob], f"dyn__{name}__handle")

    hitbox(name, (0.7, 1.2, 0.7), at, action=action, yaw_deg=yaw_deg)
    return parts


def conveyor(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0, length: float = 4.0, width: float = 0.8, height: float = 0.75) -> list:
    import bpy
    from ..core.coords import to_blender
    from .scene import link

    p = ctx.palette
    parts = []
    leg_x = length / 2 - 0.2
    leg_z = width / 2 - 0.1
    for i, (dx, dz) in enumerate([(-leg_x, -leg_z), (-leg_x, leg_z), (leg_x, -leg_z), (leg_x, leg_z)]):
        parts.append(rounded_box(f"{name}-leg-{i}", (0.08, height - 0.06, 0.08), color=p["steel"], radius=0.02, at=place((dx, 0.0, dz), at, yaw_deg), yaw_deg=yaw_deg))

    parts.append(rounded_box(f"{name}-rail-l", (length + 0.1, 0.1, 0.06), color=p["steel"], radius=0.02, at=place((0.0, height - 0.05, -width / 2 + 0.03), at, yaw_deg), yaw_deg=yaw_deg))
    parts.append(rounded_box(f"{name}-rail-r", (length + 0.1, 0.1, 0.06), color=p["steel"], radius=0.02, at=place((0.0, height - 0.05, width / 2 - 0.03), at, yaw_deg), yaw_deg=yaw_deg))
    parts.append(rounded_box(f"{name}-belt", (length, 0.04, width - 0.1), color=p["ink"], radius=0.01, at=place((0.0, height - 0.03, 0.0), at, yaw_deg), yaw_deg=yaw_deg))

    root = bpy.data.objects.new(f"dyn__{name}", None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = to_blender(place((length / 2 - 0.05, height - 0.02, 0.0), at, yaw_deg))
    link(root, "dyn")
    cylinder(f"dyn__{name}__roller", radius=0.06, height=width - 0.1, color=p["steel"], role="dyn", at=(0.0, 0.0, 0.0), parent=root)

    anchor("conveyor-in", place((-length / 2 + 0.4, height + 0.12, 0.0), at, yaw_deg))
    anchor("conveyor-mid", place((0.0, height + 0.12, 0.0), at, yaw_deg))
    anchor("conveyor-out", place((length / 2 - 0.4, height + 0.12, 0.0), at, yaw_deg))
    return parts


def stamp_machine(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    import bpy
    from ..core.coords import to_blender
    from .scene import join, link

    p = ctx.palette
    parts = [
        rounded_box(f"{name}-post-l", (0.12, 1.4, 0.12), color=p["steel"], radius=0.02, at=place((-0.45, 0.0, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-post-r", (0.12, 1.4, 0.12), color=p["steel"], radius=0.02, at=place((0.45, 0.0, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-bridge", (1.05, 0.32, 0.4), color=p["mustard"], radius=0.04, at=place((0.0, 1.35, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-led", (0.16, 0.06, 0.03), color=p["teal"], radius=0.0, segments=0, role="glow", at=place((0.0, 1.48, 0.205), at, yaw_deg), yaw_deg=yaw_deg),
    ]

    root = bpy.data.objects.new(f"dyn__{name}", None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = to_blender(place((0.0, 1.35, 0.0), at, yaw_deg))
    link(root, "dyn")

    rod = cylinder(f"dyn__{name}__head", radius=0.045, height=0.45, color=p["steel"], role="dyn", at=(0.0, -0.45, 0.0), parent=root)
    press = rounded_box(f"{name}-foot", (0.32, 0.08, 0.32), color=p["signal"], radius=0.015, role="dyn", at=(0.0, -0.45, 0.0), parent=rod)
    join([rod, press], f"dyn__{name}__head")

    anchor(f"{name}-target", place((0.0, 0.8, 0.0), at, yaw_deg))
    return parts


def deal_button(ctx: BuildContext, name: str, at: Vec3, *, action: str = "run-deal", yaw_deg: float = 0.0) -> list:
    import bpy
    from ..core.coords import to_blender
    from .scene import link

    p = ctx.palette
    parts = [
        rounded_box(f"{name}-base", (0.55, 0.8, 0.55), color=p["steel"], radius=0.04, at=at, yaw_deg=yaw_deg),
        cylinder(f"{name}-rim", radius=0.22, height=0.06, color=p["ink"], at=place((0.0, 0.8, 0.0), at, yaw_deg)),
    ]

    root = bpy.data.objects.new(f"dyn__{name}", None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = to_blender(place((0.0, 0.84, 0.0), at, yaw_deg))
    link(root, "dyn")

    cylinder(f"dyn__{name}__cap", radius=0.18, height=0.08, color=p["signal"], role="dyn", at=(0.0, 0.0, 0.0), parent=root)

    hitbox(name, (0.6, 1.0, 0.6), at, action=action, yaw_deg=yaw_deg)
    anchor(f"{name}-btn", place((0.0, 0.9, 0.0), at, yaw_deg))
    return parts


def filing_cabinet(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0, width: float = 0.9, height: float = 1.6, depth: float = 0.6) -> list:
    p = ctx.palette
    parts = [
        rounded_box(f"{name}-body", (width, height, depth), color=p["mustard"], radius=0.03, at=at, yaw_deg=yaw_deg),
    ]
    drawer_h = (height - 0.15) / 4
    for i in range(4):
        dy = 0.08 + i * drawer_h
        parts.append(rounded_box(f"{name}-drawer-{i}", (width - 0.08, drawer_h - 0.03, 0.02), color=p["ink"], radius=0.01, at=place((0.0, dy, depth / 2 + 0.01), at, yaw_deg), yaw_deg=yaw_deg))
        parts.append(rounded_box(f"{name}-handle-{i}", (0.16, 0.03, 0.03), color=p["brass"], radius=0.01, at=place((0.0, dy + drawer_h / 2 - 0.02, depth / 2 + 0.03), at, yaw_deg), yaw_deg=yaw_deg))
    return parts


def wall_screen(ctx: BuildContext, name: str, at: Vec3, *, screen_id: str = "crm-kanban", size: tuple[float, float] = (1.6, 1.0), yaw_deg: float = 0.0) -> list:
    info, p = ctx.screens[screen_id], ctx.palette
    w, h = size
    parts = [
        rounded_box(f"{name}-frame", (w + 0.08, h + 0.08, 0.06), color=p["ink"], radius=0.02, at=at, yaw_deg=yaw_deg),
        screen_plane(f"screen-{name}", size, uv=info.rect, glow=info.glow, at=place((0.0, 0.0, 0.032), at, yaw_deg), yaw_deg=yaw_deg),
    ]
    anchor(f"{name}-screen", place((0.0, 0.0, 0.05), at, yaw_deg))
    return parts


def concierge_desk(ctx: BuildContext, name: str, at: Vec3, *, action: str = "open-booking", yaw_deg: float = 0.0) -> list:
    p = ctx.palette
    parts = [
        rounded_box(f"{name}-front", (2.4, 0.95, 0.7), color=p["wood"], radius=0.04, at=at, yaw_deg=yaw_deg),
        rounded_box(f"{name}-top", (2.5, 0.06, 0.8), color=p["wood"], radius=0.02, at=place((0.0, 0.95, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        cylinder(f"{name}-bell", radius=0.07, height=0.07, color=p["brass"], at=place((-0.6, 1.01, 0.1), at, yaw_deg)),
        cylinder(f"{name}-button", radius=0.02, height=0.04, color=p["signal"], at=place((-0.6, 1.07, 0.1), at, yaw_deg)),
        rounded_box(f"{name}-ledger", (0.32, 0.03, 0.25), color=p["white"], radius=0.01, at=place((0.4, 1.01, 0.05), at, yaw_deg), yaw_deg=yaw_deg),
    ]
    hitbox(name, (2.6, 1.2, 0.9), at, action=action, yaw_deg=yaw_deg)
    anchor(f"{name}-counter", place((0.0, 1.05, 0.0), at, yaw_deg))
    return parts


def split_flap_board(ctx: BuildContext, name: str, at: Vec3, *, screen_id: str = "calendar", action: str = "open-booking", yaw_deg: float = 0.0) -> list:
    import bpy
    from ..core.coords import to_blender
    from .scene import link

    info, p = ctx.screens[screen_id], ctx.palette
    parts = [
        rounded_box(f"{name}-frame", (3.4, 1.8, 0.15), color=p["ink"], radius=0.04, at=at, yaw_deg=yaw_deg),
        rounded_box(f"{name}-recess", (3.2, 1.6, 0.06), color=p["robot-dark"], radius=0.02, at=place((0.0, 0.0, 0.06), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-header", (3.2, 0.14, 0.08), color=p["ink"], radius=0.01, at=place((0.0, 0.72, 0.08), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-lamp-l", (0.08, 0.04, 0.02), color=p["teal"], role="glow", at=place((-1.4, 0.72, 0.12), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-lamp-r", (0.08, 0.04, 0.02), color=p["mustard"], role="glow", at=place((1.4, 0.72, 0.12), at, yaw_deg), yaw_deg=yaw_deg),
        screen_plane(f"screen-{name}", (1.1, 0.7), uv=info.rect, glow=info.glow, at=place((0.95, -0.05, 0.092), at, yaw_deg), yaw_deg=yaw_deg),
    ]

    root = bpy.data.objects.new(f"dyn__{name}", None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = to_blender(place((-0.6, -0.05, 0.09), at, yaw_deg))
    link(root, "dyn")

    rounded_box(f"dyn__{name}__flap", (1.8, 1.1, 0.02), color=p["ink"], radius=0.01, role="dyn", at=(0.0, 0.0, 0.0), parent=root)

    hitbox(name, (3.5, 1.9, 0.35), at, action=action, yaw_deg=yaw_deg)
    anchor(f"{name}-board", place((0.0, 0.0, 0.12), at, yaw_deg))
    anchor(f"{name}-flaps", place((-0.6, -0.05, 0.11), at, yaw_deg))
    return parts


def luggage_trolley(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    p = ctx.palette
    parts = [
        rounded_box(f"{name}-bed", (1.2, 0.1, 0.7), color=p["signal"], radius=0.02, at=at, yaw_deg=yaw_deg),
        cylinder(f"{name}-post-l", radius=0.03, height=1.3, color=p["brass"], at=place((-0.5, 0.1, 0.0), at, yaw_deg)),
        cylinder(f"{name}-post-r", radius=0.03, height=1.3, color=p["brass"], at=place((0.5, 0.1, 0.0), at, yaw_deg)),
        rounded_box(f"{name}-cross", (1.0, 0.05, 0.05), color=p["brass"], radius=0.01, at=place((0.0, 1.35, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-bag-1", (0.7, 0.22, 0.45), color=p["mustard"], radius=0.03, at=place((0.0, 0.1, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-bag-2", (0.55, 0.18, 0.35), color=p["wood"], radius=0.025, at=place((0.05, 0.32, 0.0), at, yaw_deg), yaw_deg=yaw_deg + 12.0),
    ]
    return parts


def lounge_chair(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0, color: str = "teal") -> list:
    p = ctx.palette
    c = p[color]
    parts = [
        rounded_box(f"{name}-cushion", (0.75, 0.22, 0.75), color=c, radius=0.04, at=place((0.0, 0.25, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-back", (0.75, 0.55, 0.18), color=c, radius=0.04, at=place((0.0, 0.45, -0.32), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-arm-l", (0.12, 0.35, 0.7), color=c, radius=0.03, at=place((-0.38, 0.32, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-arm-r", (0.12, 0.35, 0.7), color=c, radius=0.03, at=place((0.38, 0.32, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        cylinder(f"{name}-leg-fl", radius=0.03, height=0.25, color=p["wood"], at=place((-0.3, 0.0, 0.28), at, yaw_deg)),
        cylinder(f"{name}-leg-fr", radius=0.03, height=0.25, color=p["wood"], at=place((0.3, 0.0, 0.28), at, yaw_deg)),
        cylinder(f"{name}-leg-bl", radius=0.03, height=0.25, color=p["wood"], at=place((-0.3, 0.0, -0.28), at, yaw_deg)),
        cylinder(f"{name}-leg-br", radius=0.03, height=0.25, color=p["wood"], at=place((0.3, 0.0, -0.28), at, yaw_deg)),
    ]
    return parts


def wall_clock(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    p = ctx.palette
    return [
        cylinder(f"{name}-rim", radius=0.32, height=0.08, color=p["ink"], at=at, yaw_deg=yaw_deg),
        cylinder(f"{name}-face", radius=0.28, height=0.02, color=p["white"], at=place((0.0, 0.0, 0.035), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-hand-h", (0.02, 0.12, 0.01), color=p["signal"], at=place((0.0, 0.05, 0.05), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-hand-m", (0.015, 0.18, 0.01), color=p["ink"], at=place((0.05, 0.06, 0.05), at, yaw_deg), yaw_deg=yaw_deg),
    ]


def assembly_slipway(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    p = ctx.palette
    parts = [
        rounded_box(f"{name}-platform", (3.6, 0.22, 1.8), color=p["steel"], radius=0.04, at=at, yaw_deg=yaw_deg),
        rounded_box(f"{name}-rail-l", (0.05, 0.03, 1.6), color=p["teal"], role="glow", at=place((-1.7, 0.22, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-rail-r", (0.05, 0.03, 1.6), color=p["teal"], role="glow", at=place((1.7, 0.22, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-ped-0", (0.65, 0.65, 0.45), color=p["robot-dark"], radius=0.02, at=place((-1.1, 0.22, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-ped-1", (0.85, 0.65, 0.45), color=p["robot-dark"], radius=0.02, at=place((0.0, 0.22, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-ped-2", (0.65, 0.65, 0.45), color=p["robot-dark"], radius=0.02, at=place((1.1, 0.22, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-mockup", (0.5, 0.35, 0.03), color=p["white"], radius=0.015, at=place((-1.1, 0.88, 0.0), at, yaw_deg), yaw_deg=yaw_deg + 15.0),
    ]
    anchor(f"{name}-stage-wireframe", place((-1.1, 0.95, 0.0), at, yaw_deg))
    anchor(f"{name}-stage-code", place((0.0, 0.95, 0.0), at, yaw_deg))
    anchor(f"{name}-stage-prod", place((1.1, 0.95, 0.0), at, yaw_deg))
    return parts


def stage_slider(ctx: BuildContext, name: str, at: Vec3, *, action: str = "next-stage", yaw_deg: float = 0.0) -> list:
    import bpy
    from ..core.coords import to_blender
    from .scene import link

    p = ctx.palette
    parts = [
        rounded_box(f"{name}-base", (1.2, 0.85, 0.45), color=p["steel"], radius=0.03, at=at, yaw_deg=yaw_deg),
        rounded_box(f"{name}-panel", (1.0, 0.04, 0.35), color=p["ink"], radius=0.01, at=place((0.0, 0.85, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-led-0", (0.05, 0.02, 0.03), color=p["teal"], role="glow", at=place((-0.28, 0.89, -0.1), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-led-1", (0.05, 0.02, 0.03), color=p["mustard"], role="glow", at=place((0.0, 0.89, -0.1), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-led-2", (0.05, 0.02, 0.03), color=p["signal"], role="glow", at=place((0.28, 0.89, -0.1), at, yaw_deg), yaw_deg=yaw_deg),
    ]

    root = bpy.data.objects.new(f"dyn__{name}", None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = to_blender(place((0.0, 0.89, 0.05), at, yaw_deg))
    link(root, "dyn")

    cylinder(f"dyn__{name}__handle", radius=0.045, height=0.12, color=p["signal"], role="dyn", at=(0.0, 0.0, 0.0), parent=root)

    hitbox(name, (1.3, 1.1, 0.55), at, action=action, yaw_deg=yaw_deg)
    anchor(f"{name}-slider", place((0.0, 0.95, 0.0), at, yaw_deg))
    return parts


def workbench(ctx: BuildContext, name: str, at: Vec3, *, yaw_deg: float = 0.0) -> list:
    p = ctx.palette
    parts = [
        rounded_box(f"{name}-top", (1.8, 0.08, 0.75), color=p["wood"], radius=0.02, at=place((0.0, 0.75, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-leg-l", (0.08, 0.75, 0.65), color=p["steel"], radius=0.015, at=place((-0.75, 0.0, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-leg-r", (0.08, 0.75, 0.65), color=p["steel"], radius=0.015, at=place((0.75, 0.0, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-board", (1.8, 0.85, 0.03), color=p["steel"], radius=0.01, at=place((0.0, 0.83, -0.36), at, yaw_deg), yaw_deg=yaw_deg),
        rounded_box(f"{name}-box", (0.35, 0.12, 0.25), color=p["signal"], radius=0.015, at=place((-0.45, 0.83, 0.1), at, yaw_deg), yaw_deg=yaw_deg),
        cylinder(f"{name}-solder", radius=0.06, height=0.08, color=p["mustard"], at=place((0.35, 0.83, 0.12), at, yaw_deg)),
    ]
    return parts


def command_desk(ctx: BuildContext, name: str, at: Vec3, *, width: float = 4.8, depth: float = 1.0, height: float = 0.74, yaw_deg: float = 0.0) -> list:
    p = ctx.palette
    top = 0.06
    parts = [
        rounded_box(f"{name}-top", (width, top, depth), color=p["wood"], radius=0.03, at=place((0.0, height - top, 0.0), at, yaw_deg), yaw_deg=yaw_deg),
    ]
    for side, label in ((-1, "l"), (0, "m"), (1, "r")):
        dx = side * (width / 2 - 0.2) if side != 0 else 0.0
        parts.append(rounded_box(f"{name}-leg-{label}", (0.08, height - top, depth * 0.8), color=p["steel"], radius=0.015, at=place((dx, 0.0, 0.0), at, yaw_deg), yaw_deg=yaw_deg))
    return parts


def capsule_dock(ctx: BuildContext, name: str, at: Vec3, *, action: str = "test-capsule", yaw_deg: float = 0.0) -> list:
    import bpy
    from ..core.coords import to_blender
    from .scene import link

    p = ctx.palette
    parts = [
        rounded_box(f"{name}-base", (0.55, 0.12, 0.55), color=p["steel"], radius=0.03, at=at, yaw_deg=yaw_deg),
        cylinder(f"{name}-funnel", radius=0.2, height=0.25, color=p["brass"], at=place((0.0, 0.12, 0.0), at, yaw_deg)),
        rounded_box(f"{name}-led", (0.12, 0.04, 0.02), color=p["signal"], role="glow", at=place((0.0, 0.06, 0.28), at, yaw_deg), yaw_deg=yaw_deg),
    ]

    root = bpy.data.objects.new(f"dyn__{name}", None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = to_blender(place((0.0, 0.25, 0.0), at, yaw_deg))
    link(root, "dyn")

    rounded_box(f"dyn__{name}__cradle", (0.32, 0.06, 0.32), color=p["brass"], radius=0.015, role="dyn", at=(0.0, 0.0, 0.0), parent=root)

    hitbox(name, (0.7, 0.8, 0.7), at, action=action, yaw_deg=yaw_deg)
    anchor("capsule-dock", place((0.0, 0.32, 0.0), at, yaw_deg))
    return parts





