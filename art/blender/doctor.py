"""Prints the Blender environment and checks the glTF exporter options the pipeline relies on."""
from __future__ import annotations

import sys

import bpy

REQUIRED_EXPORT_OPTIONS = [
    "export_format",
    "export_yup",
    "export_extras",
    "export_apply",
    "export_texcoords",
    "export_normals",
    "export_materials",
    "export_vertex_color",
    "export_active_vertex_color_when_no_material",
    "export_cameras",
    "export_lights",
    "export_animations",
]

print("Blender", bpy.app.version_string)
print("Python", sys.version.split()[0])
if tuple(bpy.app.version[:2]) != (4, 5):
    print("WARNING: the pipeline is pinned to Blender 4.5 LTS")
available = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
missing = [name for name in REQUIRED_EXPORT_OPTIONS if name not in available]
if missing:
    print("MISSING glTF exporter options:", ", ".join(missing))
    raise SystemExit(1)
print("glTF exporter OK")
