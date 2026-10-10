"""Hover robot: rounded body, screen face, antenna, arms that pivot at the shoulders, a job accessory."""
from __future__ import annotations

import math
from dataclasses import dataclass

import bpy

from ..core import naming
from ..core.coords import Vec3, to_blender
from ..core.spec import BuildContext
from ..core.uv import face_cell_rect
from .primitives import capsule, cylinder, rounded_box, screen_plane, sphere
from .scene import join, link

ACCESSORIES = ("headset", "stamp", "cap", "helmet", "none")
ACTIVITIES = ("typing", "sorting", "idle")


@dataclass(frozen=True)
class RobotSpec:
    id: str
    at: Vec3
    yaw_deg: float = 0.0
    accessory: str = "none"
    activity: str = "idle"
    body: str = "robot"
    accent: str = "teal"
    hover: float = 0.25


def _accessory(spec: RobotSpec, ctx: BuildContext, head) -> list:
    p, i = ctx.palette, spec.id
    if spec.accessory == "headset":
        return [
            rounded_box(f"{i}-acc-ear-l", (0.06, 0.16, 0.16), color=p["ink"], radius=0.03, role="dyn", at=(-0.3, 0.12, 0.0), parent=head),
            rounded_box(f"{i}-acc-ear-r", (0.06, 0.16, 0.16), color=p["ink"], radius=0.03, role="dyn", at=(0.3, 0.12, 0.0), parent=head),
            rounded_box(f"{i}-acc-band", (0.66, 0.04, 0.06), color=p["ink"], radius=0.02, role="dyn", at=(0.0, 0.41, 0.0), parent=head),
            rounded_box(f"{i}-acc-mic", (0.03, 0.03, 0.2), color=p["ink"], radius=0.01, role="dyn", at=(-0.3, 0.1, 0.12), parent=head),
        ]
    if spec.accessory == "stamp":
        return [rounded_box(f"{i}-acc-visor", (0.6, 0.05, 0.3), color=p[spec.accent], radius=0.02, role="dyn", at=(0.0, 0.38, 0.12), parent=head)]
    if spec.accessory == "cap":
        return [
            cylinder(f"{i}-acc-cap", radius=0.22, height=0.1, color=p["signal"], role="dyn", at=(0.0, 0.4, 0.0), parent=head),
            rounded_box(f"{i}-acc-brim", (0.36, 0.03, 0.2), color=p["ink"], radius=0.01, role="dyn", at=(0.0, 0.4, 0.2), parent=head),
        ]
    if spec.accessory == "helmet":
        return [
            sphere(f"{i}-acc-helmet", radius=0.3, color=p["mustard"], role="dyn", at=(0.0, 0.25, 0.0), parent=head),
            cylinder(f"{i}-acc-helmet-brim", radius=0.34, height=0.03, color=p["mustard"], role="dyn", at=(0.0, 0.3, 0.0), parent=head),
        ]
    return []


def build_robot(spec: RobotSpec, ctx: BuildContext) -> bpy.types.Object:
    if spec.accessory not in ACCESSORIES:
        raise ValueError(f"unknown accessory {spec.accessory!r}; expected one of {ACCESSORIES}")
    if spec.activity not in ACTIVITIES:
        raise ValueError(f"unknown activity {spec.activity!r}; expected one of {ACTIVITIES}")
    p, h = ctx.palette, spec.hover
    body_color, accent = p[spec.body], p[spec.accent]

    root = bpy.data.objects.new(naming.dyn(spec.id), None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = to_blender(spec.at)
    root.rotation_euler = (0.0, 0.0, math.radians(spec.yaw_deg))
    root["role"] = "robot"
    root["activity"] = spec.activity
    root["accessory"] = spec.accessory
    link(root, "dyn")

    capsule(naming.dyn(spec.id, "body"), radius=0.26, height=0.22, color=body_color, role="dyn", at=(0.0, h, 0.0), parent=root)
    head = rounded_box(naming.dyn(spec.id, "head"), (0.56, 0.4, 0.46), color=body_color, radius=0.12, segments=3, role="dyn", at=(0.0, h + 0.76, 0.0), parent=root)
    extras = [
        cylinder(f"{spec.id}-antenna", radius=0.018, height=0.16, color=p["robot-dark"], role="dyn", at=(0.0, 0.4, 0.0), parent=head),
        sphere(f"{spec.id}-antenna-tip", radius=0.045, color=accent, role="dyn", at=(0.0, 0.58, 0.0), parent=head),
        *_accessory(spec, ctx, head),
    ]
    join([head, *extras], naming.dyn(spec.id, "head"))

    faces = ctx.faces
    screen_plane(
        naming.dyn(spec.id, "face"),
        (0.42, 0.26),
        uv=face_cell_rect(0, faces.cols, faces.rows, faces.cell),
        glow=(0.35, 0.95, 0.85),
        strength=1.5,
        role="dyn",
        at=(0.0, h + 0.83, 0.232),
        parent=root,
    )

    for side, label in ((-1, "l"), (1, "r")):
        arm = cylinder(naming.dyn(spec.id, f"arm-{label}"), radius=0.05, height=0.34, color=p["robot-dark"], hang=True, role="dyn", at=(side * 0.31, h + 0.56, 0.0), parent=root)
        hand = sphere(f"{spec.id}-hand-{label}", radius=0.07, color=accent, role="dyn", at=(0.0, -0.36, 0.0), parent=arm)
        join([arm, hand], naming.dyn(spec.id, f"arm-{label}"))
    return root
