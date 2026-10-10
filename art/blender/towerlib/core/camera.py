"""Python copy of src/engine/framing.ts + camera-path.ts. Kept in sync by scene/camera-fixtures.json."""
from __future__ import annotations

import math

from .coords import Vec3


def apparent_width(width: float, depth: float, yaw_deg: float) -> float:
    yaw = math.radians(yaw_deg)
    return width * abs(math.cos(yaw)) + depth * abs(math.sin(yaw))


def framing_distance(viewport_width: float, viewport_height: float, camera: dict, level: dict) -> float:
    width = viewport_width if viewport_width > 0 else 1.0
    height = viewport_height if viewport_height > 0 else 1.0
    aspect = width / height
    rule = camera["portrait"] if aspect < 1 else camera["landscape"]
    tan_half = math.tan(math.radians(camera["fovDeg"]) / 2)
    fit_width = apparent_width(level["width"], level["depth"], camera["yawDeg"]) / (rule["fitWidth"] * 2 * tan_half * aspect)
    min_height = rule.get("minVisibleHeight")
    fit_height = 0.0 if min_height is None else min_height / (2 * tan_half)
    return max(fit_width, fit_height)


def camera_pose(lift: float, viewport_width: float, viewport_height: float, tower: dict) -> tuple[Vec3, Vec3]:
    camera, level = tower["camera"], tower["level"]
    last = len(tower["levels"]) - 1
    p = min(max(lift if math.isfinite(lift) else 0.0, 0.0), last)
    phase = p - math.floor(p)
    distance = framing_distance(viewport_width, viewport_height, camera, level) * (
        1 + camera["travelBulge"] * math.sin(math.pi * phase)
    )
    pitch, yaw = math.radians(camera["pitchDeg"]), math.radians(camera["yawDeg"])
    target_y = camera["targetHeight"] - p * level["height"]
    position = (
        math.sin(yaw) * math.cos(pitch) * distance,
        target_y + math.sin(pitch) * distance,
        math.cos(yaw) * math.cos(pitch) * distance,
    )
    return position, (0.0, target_y, 0.0)
