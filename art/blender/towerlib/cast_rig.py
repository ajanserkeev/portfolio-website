"""Builds the character cast in Blender: one skinned mesh per member, one shared set of clips.

Kenney Mini Characters share a 7-bone rig (root, torso, head, arm-left/right, leg-left/right), so
clips keyed on the first skeleton drive every member at runtime (the site binds clips by bone name).
"""
from __future__ import annotations

import bpy
from mathutils import Quaternion, Vector

from .core.cast import CUSTOM_CLIPS, CastMember, CastSpec
from .core.naming import _check

FPS = 24


def _import(path) -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    armature = next(o for o in new if o.type == "ARMATURE")
    meshes = [o for o in new if o.type == "MESH" and o.parent == armature]
    # The importer also brings a stray 'Icosphere' (a bone display shape): drop everything off-rig.
    for junk in [o for o in new if o.type == "MESH" and o not in meshes]:
        bpy.data.objects.remove(junk)
    return armature, meshes


def import_member(spec: CastSpec, member: CastMember) -> bpy.types.Object:
    """Imports one member as `cast__<id>` with a single child mesh `cast__<id>__mesh`."""
    armature, meshes = _import(spec.source_path(member))
    bpy.ops.object.select_all(action="DESELECT")
    for mesh in meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()  # body + head -> one draw call
    mesh = bpy.context.view_layer.objects.active
    while len(mesh.data.uv_layers) > 1:
        mesh.data.uv_layers.remove(mesh.data.uv_layers[-1])
    armature.name = f"cast__{_check(member.id)}"
    mesh.name = f"cast__{member.id}__mesh"
    armature.scale = (spec.scale, spec.scale, spec.scale)
    armature["role"] = member.role
    return armature


def _first_import_actions() -> dict[str, bpy.types.Action]:
    """Clips of the first import. Later imports repeat them as 'idle.001', 'idle.002'…"""
    return {a.name: a for a in bpy.data.actions if "." not in a.name}


def _bone_rotation(armature, bone_name: str, target: Vector) -> Quaternion:
    """Local pose rotation that points the bone along `target` (armature space), from its rest pose."""
    bone = armature.data.bones[bone_name]
    rest = bone.matrix_local.to_quaternion()
    rest_dir = (bone.tail_local - bone.head_local).normalized()
    swing = rest_dir.rotation_difference(target.normalized())
    return rest.inverted() @ swing @ rest


def _side(armature, bone_name: str) -> float:
    """+1 or -1: which side of the body the bone sits on (armature X)."""
    return 1.0 if armature.data.bones[bone_name].head_local.x >= 0 else -1.0


def _key_arm(action, armature, bone_name: str, frames: list[tuple[int, Vector]]) -> None:
    pose_bone = armature.pose.bones[bone_name]
    pose_bone.rotation_mode = "QUATERNION"
    path = f'pose.bones["{bone_name}"].rotation_quaternion'
    for fcurve in [fc for fc in action.fcurves if fc.data_path == path]:
        action.fcurves.remove(fcurve)
    armature.animation_data.action = action
    for frame, target in frames:
        pose_bone.rotation_quaternion = _bone_rotation(armature, bone_name, target)
        pose_bone.keyframe_insert("rotation_quaternion", frame=frame)


def _forward(armature) -> Vector:
    """Glb models face +Z; Blender's importer turns that into -Y."""
    return Vector((0.0, -1.0, 0.0))


def key_custom_clips(armature, base: dict[str, bpy.types.Action]) -> dict[str, bpy.types.Action]:
    """'type' (seated, hands on a keyboard) and 'wave' (standing, right hand up)."""
    fwd = _forward(armature)
    up = Vector((0.0, 0.0, 1.0))
    left, right = _side(armature, "arm-left"), _side(armature, "arm-right")

    typing = base["sit"].copy()
    typing.name = "type"
    def hands(side: float, lift: float) -> Vector:
        return fwd * 1.0 + up * (-0.35 + lift) + Vector((side * 0.22, 0.0, 0.0))
    _key_arm(typing, armature, "arm-left", [(1, hands(left, 0.0)), (5, hands(left, 0.14)), (9, hands(left, 0.0))])
    _key_arm(typing, armature, "arm-right", [(1, hands(right, 0.14)), (5, hands(right, 0.0)), (9, hands(right, 0.14))])

    wave = base["idle"].copy()
    wave.name = "wave"
    def raised(spread: float) -> Vector:
        return up * 1.0 + Vector((right * spread, 0.0, 0.0)) + fwd * 0.15
    _key_arm(wave, armature, "arm-right", [(1, raised(0.2)), (8, raised(0.65)), (15, raised(0.2)), (22, raised(0.65)), (29, raised(0.2))])
    _key_arm(wave, armature, "arm-left", [(1, up * -1.0 + Vector((left * 0.15, 0.0, 0.0)))])
    for action in (typing, wave):
        action.use_fake_user = True
    return {"type": typing, "wave": wave}


def build_cast(spec: CastSpec) -> list[bpy.types.Object]:
    """Imports every member and leaves the spec's clips as NLA tracks on the first skeleton."""
    bpy.context.scene.render.fps = FPS
    armatures = [import_member(spec, member) for member in spec.characters]
    first = armatures[0]
    base = _first_import_actions()
    clips = {**base, **key_custom_clips(first, base)}

    wanted = {name: clips[name] for name in spec.clips}
    for action in list(bpy.data.actions):
        if action not in wanted.values():
            bpy.data.actions.remove(action)
    for armature in armatures:
        data = armature.animation_data or armature.animation_data_create()
        for track in list(data.nla_tracks):
            data.nla_tracks.remove(track)
        data.action = None
        for pose_bone in armature.pose.bones:
            pose_bone.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
            pose_bone.location = (0.0, 0.0, 0.0)
            pose_bone.scale = (1.0, 1.0, 1.0)
    data = first.animation_data
    for name in spec.clips:
        action = wanted[name]
        track = data.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, int(action.frame_range[0]), action)
        if hasattr(strip, "action_slot") and action.slots:
            strip.action_slot = action.slots[0]
    assert set(CUSTOM_CLIPS) <= set(clips)
    return armatures


def export_cast(path) -> None:
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_animation_mode="NLA_TRACKS",
        export_tangents=False,
        export_texcoords=True,
        export_normals=True,
        export_skins=True,
        export_def_bones=True,
        export_image_format="WEBP",
    )
