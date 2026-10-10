import json
from pathlib import Path

import pytest

from towerlib.core.palette import Palette, hex_to_linear, srgb_to_linear

ART = Path(__file__).resolve().parents[1]


def test_srgb_to_linear_known_values():
    assert srgb_to_linear(0.0) == 0.0
    assert abs(srgb_to_linear(1.0) - 1.0) < 1e-12
    assert abs(srgb_to_linear(0.5) - 0.21404114) < 1e-6


def test_hex_to_linear_parses_with_and_without_hash():
    assert hex_to_linear("#FFFFFF") == hex_to_linear("ffffff")
    assert hex_to_linear("#000000") == (0.0, 0.0, 0.0)


def test_bad_hex_is_rejected():
    with pytest.raises(ValueError):
        hex_to_linear("#12345")
    with pytest.raises(ValueError):
        hex_to_linear("#GG0000")


def test_palette_reports_unknown_names():
    palette = Palette({"sand": "#F3EBDD"})
    assert palette["sand"][0] > 0.8
    with pytest.raises(KeyError, match="unknown palette color 'nope'"):
        palette["nope"]


def test_project_palette_loads():
    colors = json.loads((ART / "palette.json").read_text(encoding="utf-8"))
    palette = Palette(colors)
    for name in ("sand", "ink", "slab", "robot", "robot-dark", "teal", "mustard", "signal"):
        assert len(palette[name]) == 3
