"""Materials used only inside Blender (for baking). The web assigns its own materials by node name."""
from __future__ import annotations

import bpy

ALBEDO = "albedo"


def albedo_material() -> bpy.types.Material:
    """Matte diffuse material whose color comes from the 'albedo' color attribute."""
    mat = bpy.data.materials.get(ALBEDO)
    if mat is not None:
        return mat
    mat = bpy.data.materials.new(ALBEDO)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    attr = nodes.new("ShaderNodeAttribute")
    attr.attribute_type = "GEOMETRY"
    attr.attribute_name = ALBEDO
    links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.0
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def emission_material(name: str, color: tuple[float, float, float], strength: float) -> bpy.types.Material:
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = (*color, 1.0)
    emit.inputs["Strength"].default_value = strength
    links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat


def placeholder_material() -> bpy.types.Material:
    """Single shared material for merged meshes, so the exporter writes one primitive per mesh."""
    return bpy.data.materials.get("export") or bpy.data.materials.new("export")
