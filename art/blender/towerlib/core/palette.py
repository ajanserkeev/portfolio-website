from __future__ import annotations

_HEX = set("0123456789abcdefABCDEF")


def srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_linear(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.lstrip("#")
    if len(value) != 6 or any(ch not in _HEX for ch in value):
        raise ValueError(f"bad color {hex_color!r}, expected #RRGGBB")
    r, g, b = (int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b))


class Palette:
    """Named colors from art/palette.json, as linear RGB for Blender color attributes."""

    def __init__(self, colors: dict[str, str]):
        self._colors = {name: hex_to_linear(value) for name, value in colors.items()}

    def __getitem__(self, name: str) -> tuple[float, float, float]:
        try:
            return self._colors[name]
        except KeyError:
            raise KeyError(f"unknown palette color {name!r}") from None

    def get(self, name: str, default: tuple[float, float, float] | None = None) -> tuple[float, float, float]:
        return self._colors.get(name, default)

    def names(self) -> list[str]:
        return sorted(self._colors)

