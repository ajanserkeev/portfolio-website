"""Scene and collection helpers. Every object belongs to exactly one role collection."""
from __future__ import annotations

import bmesh
import bpy

ROLES = ("static", "screens", "glow", "dyn", "anchors", "hits", "lights", "occluders")


def reset_scene() -> None:
    """Empty factory scene: no default cube, camera or light."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def collection(role: str) -> bpy.types.Collection:
    if role not in ROLES:
        raise ValueError(f"unknown role {role!r}; expected one of {ROLES}")
    coll = bpy.data.collections.get(role)
    if coll is None:
        coll = bpy.data.collections.new(role)
        bpy.context.scene.collection.children.link(coll)
    return coll


def link(obj: bpy.types.Object, role: str) -> bpy.types.Object:
    collection(role).objects.link(obj)
    return obj


def objects_in(role: str) -> list[bpy.types.Object]:
    coll = bpy.data.collections.get(role)
    if coll is None:
        return []
    return sorted(list(coll.objects), key=lambda o: o.name)


def select_only(obj: bpy.types.Object) -> None:
    for other in bpy.context.view_layer.objects:
        other.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def sort_mesh_elements(obj: bpy.types.Object) -> None:
    if obj.type != "MESH" or obj.data is None:
        return
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.sort(key=lambda f: f.calc_center_bounds().x * 10000.0 + f.calc_center_bounds().y * 100.0 + f.calc_center_bounds().z)
    bm.verts.sort(key=lambda v: v.co.x * 10000.0 + v.co.y * 100.0 + v.co.z)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def join(objects: list[bpy.types.Object], name: str) -> bpy.types.Object:
    """Joins meshes into the first one (keeping its parent and transform) and renames it."""
    if not objects:
        raise ValueError(f"nothing to join into {name!r}")
    target = objects[0]
    if len(objects) > 1:
        with bpy.context.temp_override(
            active_object=target,
            object=target,
            selected_objects=objects,
            selected_editable_objects=objects,
        ):
            bpy.ops.object.join()
        sort_mesh_elements(target)
    target.name = name
    target.data.name = name
    return target
