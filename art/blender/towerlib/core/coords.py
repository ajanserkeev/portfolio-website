"""three.js / glTF coordinates (Y up, front = +Z) and their Blender counterparts (Z up)."""
from __future__ import annotations

import math

Vec3 = tuple[float, float, float]


def to_blender(v: Vec3) -> Vec3:
    """three.js (x, y, z) -> Blender (x, -z, y): the inverse of the glTF exporter's +Y-up conversion."""
    x, y, z = v
    return (x, -z, y)


def to_three(v: Vec3) -> Vec3:
    x, y, z = v
    return (x, z, -y)


def place(local: Vec3, at: Vec3, yaw_deg: float) -> Vec3:
    """Rotates a local offset around the vertical axis by yaw_deg and adds it to `at` (three.js coords)."""
    yaw = math.radians(yaw_deg)
    lx, ly, lz = local
    x = lx * math.cos(yaw) + lz * math.sin(yaw)
    z = -lx * math.sin(yaw) + lz * math.cos(yaw)
    return (at[0] + x, at[1] + ly, at[2] + z)
