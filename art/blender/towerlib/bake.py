"""Lightmap baking: light without albedo (the web multiplies by vertex colors), denoised and encoded with headroom."""
from __future__ import annotations

import math
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

import bpy
import numpy as np

from .kit.scene import join, objects_in, select_only

LIGHTMAP_UV = "lightmap"


@dataclass(frozen=True)
class BakeSettings:
    size: int = 1024
    samples: int = 512
    margin_px: int = 8
    exposure: float = 1.0
    headroom: float = 2.0
    denoise: bool = True
    seed: int = 7


def join_static() -> bpy.types.Object:
    meshes = [o for o in objects_in("static") if o.type == "MESH" and o.parent is None]
    return join(meshes, "static")


def unwrap_lightmap(obj: bpy.types.Object, *, margin: float = 0.004) -> None:
    mesh = obj.data
    for layer in list(mesh.uv_layers):
        mesh.uv_layers.remove(layer)
    layer = mesh.uv_layers.new(name=LIGHTMAP_UV)
    mesh.uv_layers.active = layer
    select_only(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66.0), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=True, margin=margin)
    bpy.ops.object.mode_set(mode="OBJECT")


def configure_cycles(settings: BakeSettings) -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = settings.samples
    scene.cycles.seed = settings.seed
    scene.cycles.max_bounces = 4
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 0
    scene.cycles.transmission_bounces = 0
    scene.cycles.volume_bounces = 0
    scene.cycles.transparent_max_bounces = 0
    bake = scene.render.bake
    bake.use_pass_direct = True
    bake.use_pass_indirect = True
    bake.use_pass_color = False
    bake.margin = settings.margin_px
    bake.margin_type = "EXTEND"
    bake.target = "IMAGE_TEXTURES"
    bake.use_clear = True


def bake_irradiance(obj: bpy.types.Object, settings: BakeSettings) -> bpy.types.Image:
    """Diffuse light (direct + indirect, without albedo) into a float image."""
    configure_cycles(settings)
    image = bpy.data.images.new(f"{obj.name}-irradiance", width=settings.size, height=settings.size, alpha=False, float_buffer=True)
    for slot in obj.material_slots:
        nodes = slot.material.node_tree.nodes
        node = nodes.get("bake-target") or nodes.new("ShaderNodeTexImage")
        node.name = "bake-target"
        node.image = image
        nodes.active = node
    select_only(obj)
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, margin=settings.margin_px, use_clear=True, target="IMAGE_TEXTURES")
    return image


def denoise(image: bpy.types.Image) -> bpy.types.Image:
    """Runs OpenImageDenoise through the compositor of a throwaway scene and reads the result back."""
    width, height = image.size
    scene = bpy.data.scenes.new("denoise")
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 1
    scene.cycles.device = "CPU"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.use_compositing = True
    scene.render.use_sequencer = False
    camera = bpy.data.objects.new("denoise-camera", bpy.data.cameras.new("denoise-camera"))
    scene.collection.objects.link(camera)
    scene.camera = camera
    scene.use_nodes = True
    tree = scene.node_tree
    for node in list(tree.nodes):
        tree.nodes.remove(node)
    source = tree.nodes.new("CompositorNodeImage")
    source.image = image
    denoiser = tree.nodes.new("CompositorNodeDenoise")
    denoiser.use_hdr = True
    denoiser.prefilter = "NONE"
    output = tree.nodes.new("CompositorNodeComposite")
    tree.links.new(source.outputs["Image"], denoiser.inputs["Image"])
    tree.links.new(denoiser.outputs["Image"], output.inputs["Image"])
    target = Path(tempfile.gettempdir()) / f"tower-denoise-{os.getpid()}-{image.name}.exr"
    scene.render.filepath = str(target)
    scene.render.image_settings.file_format = "OPEN_EXR"
    scene.render.image_settings.color_depth = "32"
    bpy.ops.render.render(write_still=True, scene=scene.name)
    result = bpy.data.images.load(str(target), check_existing=False)
    result.name = f"{image.name}-denoised"
    result.pixels[0]  # force the pixel buffer to load before the file is gone
    bpy.data.scenes.remove(scene)
    return result


def _srgb_encode(linear: np.ndarray) -> np.ndarray:
    return np.where(linear <= 0.0031308, linear * 12.92, 1.055 * np.power(linear, 1.0 / 2.4) - 0.055)


def _save_png(rgb_srgb: np.ndarray, size: tuple[int, int], path: Path) -> None:
    path = path.resolve()
    width, height = size
    rgba = np.ones((width * height, 4), dtype=np.float32)
    rgba[:, :3] = rgb_srgb
    image = bpy.data.images.new(path.stem, width=width, height=height, alpha=False, float_buffer=False)
    image.colorspace_settings.name = "Non-Color"  # values are already sRGB-encoded: no second conversion
    image.pixels.foreach_set(rgba.ravel())
    path.parent.mkdir(parents=True, exist_ok=True)
    image.filepath_raw = str(path)
    image.file_format = "PNG"
    image.save()


def encode_lightmap(image: bpy.types.Image, path: Path, settings: BakeSettings) -> dict[str, float]:
    """Stores irradiance * exposure / headroom as sRGB PNG; returns stats in stored units."""
    width, height = image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    rgb = pixels.reshape(-1, 4)[:, :3] * (settings.exposure / settings.headroom)
    clipped = float(np.mean(rgb > 1.0))
    rgb = np.clip(rgb, 0.0, 1.0)
    _save_png(_srgb_encode(rgb), (width, height), path)
    luminance = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    return {
        "mean": float(luminance.mean()),
        "p05": float(np.percentile(luminance, 5)),
        "p95": float(np.percentile(luminance, 95)),
        "clipped": clipped,
    }


def write_flat_lightmap(path: Path, settings: BakeSettings) -> dict[str, float]:
    """Uniform 'full light' lightmap for fast drafts (--no-bake): the web shows plain palette colors."""
    value = min(1.0, settings.exposure / settings.headroom)
    rgb = np.full((settings.size * settings.size, 3), value, dtype=np.float32)
    _save_png(_srgb_encode(rgb), (settings.size, settings.size), path)
    return {"mean": value, "p05": value, "p95": value, "clipped": 0.0}
