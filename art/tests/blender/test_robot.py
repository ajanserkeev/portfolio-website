from pathlib import Path

import bpy

from towerlib.core.naming import is_valid
from towerlib.core.spec import load_context
from towerlib.kit.robot import RobotSpec, build_robot
from towerlib.kit.scene import objects_in

ART = Path(__file__).resolve().parents[2]


def _build(**overrides):
    spec = RobotSpec(id="op-1", at=(1.0, 0.0, -1.0), accessory="headset", activity="typing", **overrides)
    return build_robot(spec, load_context(ART))


def test_robot_has_named_animatable_parts():
    root = _build()
    names = {o.name for o in objects_in("dyn")}
    assert {"dyn__op-1", "dyn__op-1__body", "dyn__op-1__head", "dyn__op-1__face", "dyn__op-1__arm-l", "dyn__op-1__arm-r"} <= names
    assert all(is_valid(n) for n in names), names
    assert root["role"] == "robot" and root["activity"] == "typing" and root["accessory"] == "headset"


def test_extras_are_merged_into_their_parts():
    _build()
    leftovers = [o.name for o in bpy.data.objects if any(tag in o.name for tag in ("antenna", "-acc-", "-hand-"))]
    assert leftovers == []


def test_arms_pivot_at_the_shoulder_and_hang_down():
    _build()
    arm = bpy.data.objects["dyn__op-1__arm-l"]
    assert arm.parent.name == "dyn__op-1"
    assert max(v.co.z for v in arm.data.vertices) < 1e-4
    assert min(v.co.z for v in arm.data.vertices) < -0.3


def test_head_sits_above_the_body():
    _build()
    head = bpy.data.objects["dyn__op-1__head"]
    body = bpy.data.objects["dyn__op-1__body"]
    assert head.location.z > body.location.z + 0.5


def test_unknown_accessory_is_rejected():
    try:
        build_robot(RobotSpec(id="x", at=(0.0, 0.0, 0.0), accessory="crown"), load_context(ART))
    except ValueError as error:
        assert "crown" in str(error)
    else:
        raise AssertionError("expected ValueError")
