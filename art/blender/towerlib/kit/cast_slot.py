"""A place for a person from the cast (contract 3.2.1): the site spawns them at this anchor."""
from __future__ import annotations

import math

import bpy

from ..core import naming
from ..core.coords import Vec3, to_blender
from .scene import link


def cast_slot(
    name: str,
    at: Vec3,
    *,
    character: str,
    clip: str = "idle",
    yaw_deg: float = 0.0,
    speed: float = 1.0,
) -> bpy.types.Object:
    """`anchor__cast__<name>`. At yaw 0 the person faces +Z (the camera); the anchor turns them."""
    empty = bpy.data.objects.new(naming.anchor("cast", name), None)
    empty.empty_display_type = "SINGLE_ARROW"
    empty.location = to_blender(at)
    empty.rotation_euler = (0.0, 0.0, math.radians(yaw_deg))
    empty["character"] = character
    empty["clip"] = clip
    empty["speed"] = speed
    return link(empty, "anchors")
