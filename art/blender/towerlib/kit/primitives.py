"""Primitive builders. Sizes and positions are in three.js units: x width, y height, z depth."""
from __future__ import annotations

import math

import bmesh
import bpy

from ..core.coords import Vec3, to_blender
from ..core.uv import UvRect
from .materials import ALBEDO, albedo_material, emission_material
from .scene import link

Color = tuple[float, float, float]


def paint(mesh: bpy.types.Mesh, color: Color) -> None:
    attr = mesh.color_attributes.get(ALBEDO) or mesh.color_attributes.new(
        name=ALBEDO, type="FLOAT_COLOR", domain="CORNER"
    )
    attr.data.foreach_set("color", [*color, 1.0] * len(attr.data))
    mesh.color_attributes.active_color = attr
    mesh.color_attributes.render_color_index = mesh.color_attributes.find(ALBEDO)


def _place(obj, role, at, yaw_deg, parent):
    obj.location = to_blender(at)
    obj.rotation_euler = (0.0, 0.0, math.radians(yaw_deg))
    if parent is not None:
        obj.parent = parent
    return link(obj, role)


def finish(
    name: str,
    bm: bmesh.types.BMesh,
    color: Color,
    *,
    role: str = "static",
    at: Vec3 = (0.0, 0.0, 0.0),
    yaw_deg: float = 0.0,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    paint(mesh, color)
    mesh.materials.append(albedo_material())
    return _place(bpy.data.objects.new(name, mesh), role, at, yaw_deg, parent)


def rounded_box(name: str, size: Vec3, *, color: Color, radius: float = 0.04, segments: int = 2, **place) -> bpy.types.Object:
    """Box resting on y=0, centered in x/z."""
    width, height, depth = size
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(width, depth, height), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0.0, 0.0, height / 2), verts=bm.verts)
    r = min(radius, width / 2 - 1e-4, height / 2 - 1e-4, depth / 2 - 1e-4)
    if r > 0 and segments > 0:
        bmesh.ops.bevel(
            bm,
            geom=list(bm.edges),
            offset=r,
            offset_type="OFFSET",
            segments=segments,
            profile=0.5,
            affect="EDGES",
            clamp_overlap=True,
        )
    return finish(name, bm, color, **place)


def cylinder(name: str, *, radius: float, height: float, color: Color, segments: int = 20, hang: bool = False, **place) -> bpy.types.Object:
    """Vertical cylinder standing on y=0, or hanging below it (for arms pivoting at the shoulder)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments, radius1=radius, radius2=radius, depth=height)
    bmesh.ops.translate(bm, vec=(0.0, 0.0, -height / 2 if hang else height / 2), verts=bm.verts)
    return finish(name, bm, color, **place)


def sphere(name: str, *, radius: float, color: Color, segments: int = 24, **place) -> bpy.types.Object:
    bm = bmesh.new()
    rings = max(8, segments // 2)
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius)
    return finish(name, bm, color, **place)


def capsule(name: str, *, radius: float, height: float, color: Color, segments: int = 24, **place) -> bpy.types.Object:
    """Vertical capsule of total height height + 2 * radius, resting on y=0."""
    bm = bmesh.new()
    rings = max(8, segments // 2)
    rings += rings % 2  # an even ring count keeps an equator ring to stretch from
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius)
    for vert in bm.verts:
        if vert.co.z > 1e-6:
            vert.co.z += height
    bmesh.ops.translate(bm, vec=(0.0, 0.0, radius), verts=bm.verts)
    return finish(name, bm, color, **place)


def plane(name: str, size: tuple[float, float], *, color: Color, **place) -> bpy.types.Object:
    """Horizontal quad at y=0 facing up; size is (width x, depth z)."""
    width, depth = size
    bm = bmesh.new()
    corners = [(-width / 2, -depth / 2, 0.0), (width / 2, -depth / 2, 0.0), (width / 2, depth / 2, 0.0), (-width / 2, depth / 2, 0.0)]
    bm.faces.new([bm.verts.new(c) for c in corners])
    return finish(name, bm, color, **place)


def tube(name: str, points: list[Vec3], *, radius: float, color: Color, segments: int = 12, **place) -> bpy.types.Object:
    """Round tube through `points` (round the corners first with core.paths.round_corners)."""
    curve = bpy.data.curves.new(f"{name}_curve", type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = max(1, segments // 4)
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (*to_blender(co), 1.0)
    holder = bpy.data.objects.new(f"{name}_holder", curve)
    bpy.context.scene.collection.objects.link(holder)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(holder.evaluated_get(depsgraph))
    bpy.data.objects.remove(holder)
    bpy.data.curves.remove(curve)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bpy.data.meshes.remove(mesh)
    return finish(name, bm, color, **place)


def screen_plane(
    name: str,
    size: tuple[float, float],
    *,
    uv: UvRect,
    glow: Color,
    strength: float = 3.0,
    role: str = "screens",
    at: Vec3 = (0.0, 0.0, 0.0),
    yaw_deg: float = 0.0,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Vertical quad facing +Z (the camera), bottom edge at y=0, UVs mapped to an atlas rectangle."""
    width, height = size
    bm = bmesh.new()
    corners = [(-width / 2, 0.0, 0.0), (width / 2, 0.0, 0.0), (width / 2, 0.0, height), (-width / 2, 0.0, height)]
    face = bm.faces.new([bm.verts.new(c) for c in corners])
    layer = bm.loops.layers.uv.new("screen")
    for loop, co in zip(face.loops, uv.corners_blender()):
        loop[layer].uv = co
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(emission_material(f"emit-{name}", glow, strength))
    return _place(bpy.data.objects.new(name, mesh), role, at, yaw_deg, parent)
