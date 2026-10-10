"""Scene and collection helpers. Every object belongs to exactly one role collection."""
from __future__ import annotations

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
    return list(coll.objects) if coll is not None else []


def select_only(obj: bpy.types.Object) -> None:
    for other in bpy.context.view_layer.objects:
        other.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


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
    target.name = name
    target.data.name = name
    return target
