from pathlib import Path

import bpy

from towerlib.core.spec import load_context
from towerlib.kit.person import PersonSpec, build_person

ART = Path(__file__).resolve().parents[2]


def _world_z(obj):
    bpy.context.view_layer.update()
    zs = [(obj.matrix_world @ v.co).z for v in obj.data.vertices]
    return min(zs), max(zs)


def _build(glasses=True):
    spec = PersonSpec(id="lead", name="A", role="R", at=(0.0, 0.0, 0.0), glasses=glasses)
    return build_person(spec, load_context(ART))


def test_hair_and_glasses_stay_on_the_head():
    _build()
    # Head, hair and glasses are joined into one part; a detached hair block would float near 2 m.
    _, head_top = _world_z(bpy.data.objects["dyn__lead__head"])
    assert head_top < 1.45, head_top


def test_collar_sits_on_the_torso():
    _build(glasses=False)
    torso_bottom, torso_top = _world_z(bpy.data.objects["dyn__lead__body"])
    assert torso_top < 1.1, torso_top
    assert torso_bottom > 0.3, torso_bottom
