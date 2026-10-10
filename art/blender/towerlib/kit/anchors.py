from __future__ import annotations

import bpy

from ..core import naming
from ..core.coords import Vec3, to_blender
from .primitives import rounded_box
from .scene import link


def anchor(name: str, at: Vec3, **extras: str | float | int) -> bpy.types.Object:
    """Empty node the web looks up by name (without the 'anchor__' prefix)."""
    empty = bpy.data.objects.new(naming.anchor(name), None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.location = to_blender(at)
    for key, value in extras.items():
        empty[key] = value
    return link(empty, "anchors")


def hitbox(name: str, size: Vec3, at: Vec3, *, action: str, yaw_deg: float = 0.0) -> bpy.types.Object:
    """Invisible box for pointer hits; hidden from the bake, exported for the web."""
    obj = rounded_box(naming.hit(name), size, color=(1.0, 1.0, 1.0), radius=0.0, segments=0, role="hits", at=at, yaw_deg=yaw_deg)
    obj["action"] = action
    obj.hide_render = True
    return obj
