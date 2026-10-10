import bpy

from towerlib.core.palette import hex_to_linear
from towerlib.kit import primitives as kit
from towerlib.kit.scene import objects_in

TEAL = hex_to_linear("#1FA59A")


def _zs(obj):
    return [v.co.z for v in obj.data.vertices]


def _xs(obj):
    return [v.co.x for v in obj.data.vertices]


def test_rounded_box_has_size_color_and_bevel():
    obj = kit.rounded_box("box", (2.0, 1.0, 0.5), color=TEAL, radius=0.05)
    assert abs(max(_xs(obj)) - min(_xs(obj)) - 2.0) < 1e-4
    assert abs(max(_zs(obj)) - 1.0) < 1e-4 and abs(min(_zs(obj))) < 1e-4
    assert len(obj.data.polygons) > 6
    attr = obj.data.color_attributes.get("albedo")
    assert attr is not None and attr.domain == "CORNER"
    assert abs(attr.data[0].color[0] - TEAL[0]) < 1e-5
    assert obj.data.color_attributes.active_color.name == "albedo"
    assert obj.data.materials[0].name == "albedo"


def test_location_and_yaw_use_three_coordinates():
    obj = kit.rounded_box("placed", (1, 1, 1), color=TEAL, at=(1.0, 2.0, 3.0), yaw_deg=90.0)
    assert tuple(round(c, 5) for c in obj.location) == (1.0, -3.0, 2.0)
    assert abs(obj.rotation_euler[2] - 1.5707963) < 1e-5


def test_cylinder_stands_or_hangs():
    standing = kit.cylinder("stand", radius=0.1, height=0.5, color=TEAL)
    hanging = kit.cylinder("hang", radius=0.1, height=0.5, color=TEAL, hang=True)
    assert abs(min(_zs(standing))) < 1e-5 and abs(max(_zs(standing)) - 0.5) < 1e-5
    assert abs(max(_zs(hanging))) < 1e-5 and abs(min(_zs(hanging)) + 0.5) < 1e-5


def test_capsule_has_the_requested_total_height():
    obj = kit.capsule("cap", radius=0.25, height=0.3, color=TEAL)
    assert abs(min(_zs(obj))) < 1e-5 and abs(max(_zs(obj)) - 0.8) < 1e-4


def test_sphere_is_centered():
    obj = kit.sphere("ball", radius=0.5, color=TEAL)
    assert abs(max(_zs(obj)) + min(_zs(obj))) < 1e-5


def test_plane_faces_up():
    obj = kit.plane("floor", (4.0, 2.0), color=TEAL)
    assert len(obj.data.polygons) == 1
    assert obj.data.polygons[0].normal.z > 0.99


def test_tube_is_a_mesh_and_cleans_up_its_curve():
    obj = kit.tube("pipe", [(0, 0, 0), (0, 2, 0), (2, 2, 0)], radius=0.1, color=TEAL)
    assert obj.type == "MESH" and len(obj.data.vertices) > 0
    assert "pipe_curve" not in bpy.data.curves
    assert "pipe_holder" not in bpy.data.objects


def test_screen_plane_faces_the_camera_and_maps_uvs():
    from towerlib.core.uv import UvRect

    rect = UvRect(0, 0, 512, 256, 1024, 1024)
    obj = kit.screen_plane("screen-x", (0.6, 0.4), uv=rect, glow=(0.5, 0.5, 0.5))
    assert obj.data.polygons[0].normal.y < -0.99
    uvs = sorted(tuple(round(c, 5) for c in loop.uv) for loop in obj.data.uv_layers["screen"].data)
    assert uvs == sorted([(0.0, 0.75), (0.5, 0.75), (0.5, 1.0), (0.0, 1.0)])
    assert obj.name in [o.name for o in objects_in("screens")]


def test_objects_land_in_their_role_collection():
    obj = kit.rounded_box("in-dyn", (1, 1, 1), color=TEAL, role="dyn")
    assert obj.name in [o.name for o in objects_in("dyn")]
