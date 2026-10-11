"""Parametric human team characters for the basement studio."""
from __future__ import annotations

import math
from dataclasses import dataclass

import bpy

from ..core import naming
from ..core.coords import Vec3, to_blender
from ..core.spec import BuildContext
from ..core.uv import face_cell_rect
from .anchors import anchor, hitbox
from .primitives import cylinder, rounded_box, screen_plane, sphere
from .scene import join, link


@dataclass(frozen=True)
class PersonSpec:
    id: str
    name: str
    role: str
    at: Vec3
    yaw_deg: float = 0.0
    hair: str = "ink"
    shirt: str = "teal"
    skin: str = "wood"
    glasses: bool = False
    activity: str = "typing"


def build_person(spec: PersonSpec, ctx: BuildContext) -> bpy.types.Object:
    p = ctx.palette
    skin_color = p.get(spec.skin, p["wood"])
    shirt_color = p.get(spec.shirt, p["teal"])
    hair_color = p.get(spec.hair, p["ink"])

    root = bpy.data.objects.new(naming.dyn(spec.id), None)
    root.empty_display_type = "PLAIN_AXES"
    root.location = to_blender(spec.at)
    root.rotation_euler = (0.0, 0.0, math.radians(spec.yaw_deg))
    root["role"] = "person"
    root["activity"] = spec.activity
    root["person_name"] = spec.name
    root["person_role"] = spec.role
    link(root, "dyn")

    # Torso (body)
    torso = rounded_box(
        naming.dyn(spec.id, "body"),
        (0.48, 0.52, 0.32),
        color=shirt_color,
        radius=0.06,
        role="dyn",
        at=(0.0, 0.45, 0.0),
        parent=root,
    )
    collar = cylinder(
        f"{spec.id}-collar",
        radius=0.12,
        height=0.08,
        color=skin_color,
        role="dyn",
        at=(0.0, 0.52, 0.0),  # local to the torso: its top edge
        parent=torso,
    )
    join([torso, collar], naming.dyn(spec.id, "body"))

    # Head and hair
    head = rounded_box(
        naming.dyn(spec.id, "head"),
        (0.38, 0.38, 0.36),
        color=skin_color,
        radius=0.08,
        role="dyn",
        at=(0.0, 0.95, 0.0),
        parent=root,
    )
    hair = rounded_box(
        f"{spec.id}-hair",
        (0.42, 0.16, 0.4),
        color=hair_color,
        radius=0.04,
        role="dyn",
        at=(0.0, 0.30, 0.0),  # local to the head
        parent=head,
    )
    extras = [hair]
    if spec.glasses:
        frame = rounded_box(
            f"{spec.id}-glasses",
            (0.36, 0.08, 0.04),
            color=p["ink"],
            radius=0.015,
            role="dyn",
            at=(0.0, 0.17, 0.19),  # local to the head: eye level
            parent=head,
        )
        extras.append(frame)
    join([head, *extras], naming.dyn(spec.id, "head"))

    # Screen face
    faces = ctx.faces
    screen_plane(
        naming.dyn(spec.id, "face"),
        (0.32, 0.22),
        uv=face_cell_rect(0, faces.cols, faces.rows, faces.cell),
        glow=(0.95, 0.92, 0.85),
        strength=1.2,
        role="dyn",
        at=(0.0, 0.96, 0.185),
        parent=root,
    )

    # Arms
    for side, label in ((-1, "l"), (1, "r")):
        arm = cylinder(
            naming.dyn(spec.id, f"arm-{label}"),
            radius=0.05,
            height=0.36,
            color=shirt_color,
            hang=True,
            role="dyn",
            at=(side * 0.28, 0.68, 0.0),
            parent=root,
        )
        hand = sphere(
            f"{spec.id}-hand-{label}",
            radius=0.065,
            color=skin_color,
            role="dyn",
            at=(0.0, -0.38, 0.0),
            parent=arm,
        )
        join([arm, hand], naming.dyn(spec.id, f"arm-{label}"))

    # Hitbox and anchor
    hitbox(spec.id, (0.7, 1.4, 0.7), spec.at, action=f"view-{spec.id}", yaw_deg=spec.yaw_deg)
    anchor(f"person-{spec.id}", (spec.at[0], spec.at[1] + 1.25, spec.at[2]))
    return root
