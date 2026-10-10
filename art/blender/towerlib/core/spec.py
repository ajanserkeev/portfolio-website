"""Everything a level script needs, loaded from the repository's config files."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .palette import Palette, hex_to_linear
from .uv import UvRect


@dataclass(frozen=True)
class LevelDims:
    width: float
    depth: float
    height: float
    slab: float


@dataclass(frozen=True)
class ScreenInfo:
    rect: UvRect
    glow: tuple[float, float, float]


@dataclass(frozen=True)
class FacesInfo:
    cols: int
    rows: int
    cell: int
    frames: tuple[str, ...]


@dataclass(frozen=True)
class BuildContext:
    tower: dict
    dims: LevelDims
    palette: Palette
    screens: dict[str, ScreenInfo]
    faces: FacesInfo


def _json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_context(art_dir: Path) -> BuildContext:
    tower = _json(art_dir.parent / "scene" / "tower.json")
    level = tower["level"]
    screens_raw = _json(art_dir / "screens" / "manifest.json")
    faces_raw = _json(art_dir / "faces" / "manifest.json")
    screens = {
        name: ScreenInfo(
            rect=UvRect(s["x"], s["y"], s["width"], s["height"], screens_raw["width"], screens_raw["height"]),
            glow=hex_to_linear(s["glow"]),
        )
        for name, s in screens_raw["screens"].items()
    }
    return BuildContext(
        tower=tower,
        dims=LevelDims(level["width"], level["depth"], level["height"], level["slab"]),
        palette=Palette(_json(art_dir / "palette.json")),
        screens=screens,
        faces=FacesInfo(faces_raw["cols"], faces_raw["rows"], faces_raw["cell"], tuple(faces_raw["frames"])),
    )
