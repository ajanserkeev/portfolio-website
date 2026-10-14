"""Brick layout for the facade: cell boundaries of one connected grid and which cells are mortar.

A wall is a single grid of faces (one lightmap island); bricks and joints differ only in colour.
Rows alternate brick / mortar; every other brick row is offset by half a brick.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

_EPS = 1e-6


@dataclass(frozen=True)
class BrickGrid:
    xs: list[float]
    ys: list[float]
    brick: tuple[float, float]
    mortar: float
    _rows: tuple[tuple[str, int], ...]

    def cell(self, col: int, row: int) -> int | None:
        """Brick number of grid cell (col, row), or None for mortar."""
        kind, brick_row = self._rows[row]
        if kind == "mortar":
            return None
        length = self.brick[0]
        period = length + self.mortar
        shift = period / 2 if brick_row % 2 else 0.0
        x = (self.xs[col] + self.xs[col + 1]) / 2 + shift
        if x % period >= length:
            return None
        return brick_row * 1000 + int(x // period)


def _breaks(total: float, period: float, length: float, shift: float) -> list[float]:
    """Joint edges (start and end of each mortar gap) inside (0, total) for one row phase."""
    edges = []
    k = -1
    while True:
        start = k * period + length - shift
        if start >= total:
            return edges
        for edge in (start, start + period - length):
            if _EPS < edge < total - _EPS:
                edges.append(edge)
        k += 1


def brick_grid(width: float, height: float, *, brick: tuple[float, float] = (0.5, 0.2), mortar: float = 0.03) -> BrickGrid:
    length, tall = brick
    period = length + mortar
    xs = sorted({0.0, width, *_breaks(width, period, length, 0.0), *_breaks(width, period, length, period / 2)})
    ys, rows = [0.0], []
    y, brick_row = 0.0, 0
    while y < height - _EPS:
        top = min(y + tall, height)
        ys.append(top)
        rows.append(("brick", brick_row))
        brick_row += 1
        y = top
        if y >= height - _EPS:
            break
        top = min(y + mortar, height)
        ys.append(top)
        rows.append(("mortar", -1))
        y = top
    return BrickGrid(xs=xs, ys=ys, brick=brick, mortar=mortar, _rows=tuple(rows))


def shade(brick_id: int) -> int:
    """0, 1 or 2: which of three brick tones, stable per brick and without visible pattern."""
    return int(abs(math.sin(brick_id * 12.9898) * 43758.5453)) % 3
