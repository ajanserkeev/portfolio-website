import tempfile
from pathlib import Path

import bpy
import numpy as np

from towerlib import bake, rig
from towerlib.kit import primitives as kit
from towerlib.kit.scene import reset_scene

GREY = (0.6, 0.6, 0.6)


def _bake_floor(*, with_block: bool, samples: int):
    kit.plane("floor", (4.0, 4.0), color=GREY)
    if with_block:
        kit.rounded_box("block", (1.0, 1.0, 1.0), color=GREY, radius=0.0, segments=0, role="occluders")
    rig.daylight()
    static = bake.join_static()
    bake.unwrap_lightmap(static)
    settings = bake.BakeSettings(size=128, samples=samples, denoise=False)
    return bake.bake_irradiance(static, settings), settings


def _luminance(image) -> np.ndarray:
    width, height = image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    return pixels.reshape(height, width, 4)[:, :, :3].mean(axis=2)


def _noise(image) -> float:
    lum = _luminance(image)
    mask = lum > 1e-6
    inner = np.zeros_like(mask)
    inner[1:-1, 1:-1] = mask[1:-1, 1:-1] & mask[:-2, 1:-1] & mask[2:, 1:-1] & mask[1:-1, :-2] & mask[1:-1, 2:]
    padded = np.pad(lum, 1, mode="edge")
    box = sum(padded[dy : dy + lum.shape[0], dx : dx + lum.shape[1]] for dy in range(3) for dx in range(3)) / 9.0
    return float(np.std((lum - box)[inner]))


def test_a_block_casts_a_contact_shadow():
    image, _ = _bake_floor(with_block=True, samples=32)
    shadowed = np.percentile(_luminance(image)[_luminance(image) > 1e-6], 5)
    reset_scene()
    image, _ = _bake_floor(with_block=False, samples=32)
    open_floor = np.percentile(_luminance(image)[_luminance(image) > 1e-6], 5)
    assert shadowed < open_floor * 0.7, (shadowed, open_floor)


def test_denoise_reduces_noise():
    image, _ = _bake_floor(with_block=True, samples=2)
    raw = _noise(image)
    clean = _noise(bake.denoise(image))
    assert clean < raw * 0.6, (clean, raw)


def test_encoded_lightmap_is_a_png_in_range():
    image, settings = _bake_floor(with_block=False, samples=8)
    out = Path(tempfile.mkdtemp()) / "lightmap test.png"
    stats = bake.encode_lightmap(image, out, settings)
    assert out.exists()
    loaded = bpy.data.images.load(str(out))
    pixels = np.empty(loaded.size[0] * loaded.size[1] * 4, dtype=np.float32)
    loaded.pixels.foreach_get(pixels)
    assert pixels.min() >= 0.0 and pixels.max() <= 1.0
    assert stats["mean"] > 0.05


def test_flat_lightmap_encodes_full_light():
    out = Path(tempfile.mkdtemp()) / "flat.png"
    bake.write_flat_lightmap(out, bake.BakeSettings(size=8))
    loaded = bpy.data.images.load(str(out))
    loaded.colorspace_settings.name = "Non-Color"
    value = loaded.pixels[0]
    assert abs(value - 0.7353569) < 0.01  # sRGB encoding of 1.0 / headroom (0.5)
