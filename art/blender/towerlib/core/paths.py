"""Rounded polylines for pneumatic tubes: sharp corners make self-intersecting tube meshes."""
from __future__ import annotations

import math

from .coords import Vec3


def _sub(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _along(origin: Vec3, direction: Vec3, distance: float) -> Vec3:
    length = math.sqrt(sum(c * c for c in direction))
    return tuple(o + d / length * distance for o, d in zip(origin, direction))  # type: ignore[return-value]


def _collinear(a: Vec3, b: Vec3) -> bool:
    cross = (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
    return math.sqrt(sum(c * c for c in cross)) < 1e-9


def _bezier(p0: Vec3, p1: Vec3, p2: Vec3, t: float) -> Vec3:
    u = 1.0 - t
    return tuple(u * u * a + 2 * u * t * b + t * t * c for a, b, c in zip(p0, p1, p2))  # type: ignore[return-value]


def round_corners(points: list[Vec3], radius: float, segments: int = 6) -> list[Vec3]:
    """Replaces every interior corner with a quadratic arc of up to `radius` (limited by segment lengths)."""
    if len(points) < 3 or radius <= 0:
        return list(points)
    result: list[Vec3] = [points[0]]
    for a, b, c in zip(points, points[1:], points[2:]):
        incoming, outgoing = _sub(b, a), _sub(c, b)
        r = min(radius, math.dist(a, b) / 2, math.dist(b, c) / 2)
        if r <= 1e-9 or _collinear(incoming, outgoing):
            result.append(b)
            continue
        start = _along(b, _sub(a, b), r)
        end = _along(b, outgoing, r)
        result.extend(_bezier(start, b, end, i / segments) for i in range(segments + 1))
    result.append(points[-1])
    return result
