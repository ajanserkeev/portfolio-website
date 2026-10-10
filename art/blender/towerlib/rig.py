"""Lighting shared by every level: warm sun from the front-left, soft sky, interior lamps."""
from __future__ import annotations

import math

import bpy

from .core.coords import Vec3, to_blender
from .kit.scene import link


def daylight(
    *,
    sun_energy: float = 3.5,
    sun_angle_deg: float = 10.0,
    sky_color: tuple[float, float, float] = (0.78, 0.84, 0.95),
    sky_strength: float = 0.7,
) -> None:
    world = bpy.data.worlds.new("sky")
    world.use_nodes = True
    background = world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (*sky_color, 1.0)
    background.inputs["Strength"].default_value = sky_strength
    bpy.context.scene.world = world
    data = bpy.data.lights.new("sun", type="SUN")
    data.energy = sun_energy
    data.angle = math.radians(sun_angle_deg)
    data.color = (1.0, 0.95, 0.88)
    sun = bpy.data.objects.new("sun", data)
    # Travels toward the back wall and down: the light comes from the open front, slightly from the left.
    sun.rotation_euler = (math.radians(50.0), 0.0, math.radians(-35.0))
    link(sun, "lights")


def area_lamp(
    name: str,
    at: Vec3,
    *,
    size: float = 0.5,
    energy: float = 180.0,
    color: tuple[float, float, float] = (1.0, 0.9, 0.75),
) -> bpy.types.Object:
    data = bpy.data.lights.new(name, type="AREA")
    data.size = size
    data.energy = energy
    data.color = color
    lamp = bpy.data.objects.new(name, data)
    lamp.location = to_blender(at)  # area lights point down by default
    return link(lamp, "lights")
