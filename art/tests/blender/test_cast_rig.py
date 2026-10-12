from pathlib import Path

import bpy
from mathutils import Vector

from towerlib.cast_rig import build_cast
from towerlib.core.cast import load_cast

ART = Path(__file__).resolve().parents[2]
VENDOR = ART / "vendor" / "kenney-mini-characters"


def _cast(tmp_name="cast-test.json", members=("character-male-a", "character-female-b")):
    import json
    import tempfile

    spec = {
        "scale": 1.7,
        "clips": ["idle", "sit", "type", "wave"],
        "characters": [{"id": f"m{i}", "source": s, "role": "client"} for i, s in enumerate(members)],
    }
    path = Path(tempfile.gettempdir()) / tmp_name
    path.write_text(json.dumps(spec), encoding="utf-8")
    return load_cast(path, VENDOR)


def _height(armature):
    dg = bpy.context.evaluated_depsgraph_get()
    mesh = next(c for c in armature.children if c.type == "MESH").evaluated_get(dg)
    zs = [(mesh.matrix_world @ v.co).z for v in mesh.to_mesh().vertices]
    return max(zs) - min(zs)


def test_each_member_is_one_skinned_mesh_under_its_skeleton():
    armatures = build_cast(_cast())
    assert [a.name for a in armatures] == ["cast__m0", "cast__m1"]
    for armature in armatures:
        meshes = [c for c in armature.children if c.type == "MESH"]
        assert [m.name for m in meshes] == [f"{armature.name}__mesh"]
        assert len(meshes[0].data.uv_layers) == 1
    assert not [o for o in bpy.data.objects if o.name.startswith("Icosphere")]


def test_members_are_scaled_to_the_tower():
    for armature in build_cast(_cast()):
        assert 0.95 < _height(armature) < 1.45, (armature.name, _height(armature))


def test_only_the_spec_clips_ship_as_tracks_of_the_first_skeleton():
    first, second = build_cast(_cast())
    assert [t.name for t in first.animation_data.nla_tracks] == ["idle", "sit", "type", "wave"]
    assert not second.animation_data or not second.animation_data.nla_tracks
    assert sorted(a.name for a in bpy.data.actions) == ["idle", "sit", "type", "wave"]


def _tail_at(armature, action, bone, frame):
    armature.animation_data.action = action
    if hasattr(armature.animation_data, "action_slot") and action.slots:
        armature.animation_data.action_slot = action.slots[0]
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    pose_bone = armature.pose.bones[bone]
    return armature.matrix_world @ pose_bone.tail, armature.matrix_world @ pose_bone.head


def test_wave_raises_the_right_hand_above_the_shoulder():
    first, _ = build_cast(_cast())
    tail, head = _tail_at(first, bpy.data.actions["wave"], "arm-right", 8)
    assert tail.z > head.z + 0.1


def test_typing_puts_both_hands_in_front_of_the_body():
    first, _ = build_cast(_cast())
    for bone in ("arm-left", "arm-right"):
        tail, head = _tail_at(first, bpy.data.actions["type"], bone, 1)
        forward = Vector((0.0, -1.0, 0.0))
        assert (tail - head).normalized().dot(forward) > 0.6, bone
