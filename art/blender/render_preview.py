"""Full Cycles render of a level from the site's camera, for review and calibration (no bake)."""
from __future__ import annotations

import argparse
import importlib
import math
import sys
from pathlib import Path

ART = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ART / "blender"))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

from towerlib.core.args import script_args  # noqa: E402
from towerlib.core.camera import camera_pose  # noqa: E402
from towerlib.core.coords import to_blender  # noqa: E402
from towerlib.core.spec import load_context  # noqa: E402
from towerlib.kit.scene import reset_scene  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--level", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--width", type=int, default=900)
    parser.add_argument("--height", type=int, default=1200)
    parser.add_argument("--samples", type=int, default=64)
    parser.add_argument("--exposure", type=float, default=1.0)
    args = parser.parse_args(script_args(sys.argv))

    reset_scene()
    ctx = load_context(ART)
    importlib.import_module(f"levels.{args.level.replace('-', '_')}").build(ctx)

    # Ensure camera rays see the site background color (sand), while ambient lighting keeps the daylight sky.
    world = bpy.context.scene.world
    if world and world.node_tree:
        tree = world.node_tree
        bg_sky = tree.nodes.get("Background")
        if bg_sky:
            lp = tree.nodes.new("ShaderNodeLightPath")
            bg_cam = tree.nodes.new("ShaderNodeBackground")
            bg_cam.inputs["Color"].default_value = (*ctx.palette["sand"], 1.0)
            bg_cam.inputs["Strength"].default_value = 1.0
            mix = tree.nodes.new("ShaderNodeMixShader")
            tree.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
            tree.links.new(bg_sky.outputs["Background"], mix.inputs[1])
            tree.links.new(bg_cam.outputs["Background"], mix.inputs[2])
            output = tree.nodes.get("World Output")
            if output:
                tree.links.new(mix.outputs["Shader"], output.inputs["Surface"])


    # The level is built at its local origin, so the lift-0 pose frames it exactly like the site does.
    position, target = camera_pose(0.0, args.width, args.height, ctx.tower)
    data = bpy.data.cameras.new("preview")
    data.lens_unit = "FOV"
    data.sensor_fit = "VERTICAL"
    data.angle_y = math.radians(ctx.tower["camera"]["fovDeg"])
    camera = bpy.data.objects.new("preview", data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = Vector(to_blender(position))
    camera.rotation_euler = (Vector(to_blender(target)) - camera.location).to_track_quat("-Z", "Y").to_euler()

    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x = args.width
    scene.render.resolution_y = args.height
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = math.log2(args.exposure)
    scene.render.image_settings.file_format = "PNG"
    out = Path(args.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)


main()
