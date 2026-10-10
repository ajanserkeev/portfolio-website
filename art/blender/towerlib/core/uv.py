from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class UvRect:
    """Rectangle in image space: x, y from the top-left corner, in pixels."""

    x: float
    y: float
    width: float
    height: float
    image_width: float
    image_height: float

    def corners_blender(self) -> list[tuple[float, float]]:
        """Bottom-left, bottom-right, top-right, top-left in Blender UV space (v up).

        The glTF exporter flips v, so the web sees image-space rows: load atlases with flipY = false.
        """
        u0 = self.x / self.image_width
        u1 = (self.x + self.width) / self.image_width
        v_top = 1.0 - self.y / self.image_height
        v_bottom = 1.0 - (self.y + self.height) / self.image_height
        return [(u0, v_bottom), (u1, v_bottom), (u1, v_top), (u0, v_top)]


def face_cell_rect(index: int, cols: int, rows: int, cell: int) -> UvRect:
    return UvRect(
        x=(index % cols) * cell,
        y=(index // cols) * cell,
        width=cell,
        height=cell,
        image_width=cols * cell,
        image_height=rows * cell,
    )
