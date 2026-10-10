"""Final clean-up and glTF export. Names and attributes must match docs/02-implementation-plan.md, contract 3.2."""
from __future__ import annotations

from pathlib import Path

import bpy

from .kit.materials import placeholder_material
from .kit.scene import join, objects_in


def finalize_for_export() -> None:
    """Removes bake-only objects and gives merged roles a single material (one glTF primitive each)."""
    for obj in objects_in("occluders") + objects_in("lights"):
        bpy.data.objects.remove(obj, do_unlink=True)
    for obj in [o for o in bpy.data.objects if o.type == "CAMERA"]:
        bpy.data.objects.remove(obj, do_unlink=True)
    shared = placeholder_material()
    for role in ("screens", "glow"):
        for obj in objects_in(role):
            obj.data.materials.clear()
            obj.data.materials.append(shared)


def merge_role(role: str, name: str) -> bpy.types.Object | None:
    meshes = [o for o in objects_in(role) if o.type == "MESH" and o.parent is None]
    return join(meshes, name) if meshes else None


def export_glb(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_yup=True,
        export_extras=True,
        export_apply=False,
        export_texcoords=True,
        export_normals=True,
        export_materials="NONE",
        export_vertex_color="ACTIVE",
        export_active_vertex_color_when_no_material=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
    )
