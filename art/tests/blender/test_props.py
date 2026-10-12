from pathlib import Path

from towerlib.core.naming import is_valid
from towerlib.core.spec import load_context
from towerlib.kit import props, shell
from towerlib.kit.scene import objects_in

ART = Path(__file__).resolve().parents[2]


def _ctx():
    return load_context(ART)


def test_floor_shell_has_walls_and_a_ceiling_occluder():
    ctx = _ctx()
    parts = shell.level_shell(ctx, kind="floor")
    shell.ceiling_occluder(ctx)
    names = {p.name for p in parts}
    assert {"shell-floor", "shell-back", "shell-left", "shell-right"} <= names
    floor = next(p for p in parts if p.name == "shell-floor")
    # matrix_world is stale until the depsgraph updates, so add the location by hand.
    top = floor.location.z + max(v.co.z for v in floor.data.vertices)
    assert abs(top) < 1e-4
    assert len(objects_in("occluders")) == 1


def test_roof_shell_is_open():
    names = {p.name for p in shell.level_shell(_ctx(), kind="roof")}
    assert "shell-back" not in names and "shell-floor" in names


def test_monitor_screen_uses_its_atlas_rect():
    ctx = _ctx()
    parts = props.monitor(ctx, "mon", (0.0, 0.74, 0.0), screen_id="code")
    screen = next(p for p in parts if p.name == "screen-mon")
    rect = ctx.screens["code"].rect
    us = [loop.uv[0] for loop in screen.data.uv_layers["screen"].data]
    assert abs(min(us) - rect.x / rect.image_width) < 1e-6
    assert screen in objects_in("screens")


def test_unknown_screen_fails_loudly():
    try:
        props.monitor(_ctx(), "mon", (0.0, 0.0, 0.0), screen_id="nope")
    except KeyError as error:
        assert "nope" in str(error)
    else:
        raise AssertionError("expected KeyError")


def test_interactive_props_create_valid_anchors_and_hits():
    ctx = _ctx()
    props.sorter(ctx, "sorter", (3.6, 0.0, -0.8))
    props.wall_phone(ctx, "phone", (0.0, 0.9, -2.85))
    anchors = [o.name for o in objects_in("anchors")]
    hits = [o.name for o in objects_in("hits")]
    assert {"anchor__capsule-in", "anchor__capsule-lead", "anchor__capsule-support", "anchor__capsule-spam", "anchor__phone-screen"} <= set(anchors)
    assert {"hit__sorter", "hit__phone"} <= set(hits)
    assert all(is_valid(n) for n in anchors + hits)
    phone_hit = next(o for o in objects_in("hits") if o.name == "hit__phone")
    assert phone_hit["action"] == "open-chat" and phone_hit.hide_render


def test_lamp_adds_a_glow_disc_and_a_light():
    props.ceiling_lamp(_ctx(), "lamp", (0.0, 3.5, 0.0))
    assert len(objects_in("glow")) == 1
    assert len(objects_in("lights")) == 1


def test_server_rack_leds_glow():
    props.server_rack(_ctx(), "rack", (-5.0, 0.0, -2.4), leds=6)
    assert len(objects_in("glow")) == 6


def test_split_flap_board_fits_under_the_ceiling():
    import bpy

    ctx = _ctx()
    props.split_flap_board(ctx, "board", (0.0, 1.8, -2.85), screen_id="calendar")
    bpy.context.view_layer.update()

    def world_z(name):
        obj = bpy.data.objects[name]
        zs = [(obj.matrix_world @ v.co).z for v in obj.data.vertices]
        return min(zs), max(zs)

    frame_bottom, frame_top = world_z("board-frame")
    assert frame_top <= 2.9 and frame_bottom >= 0.7, (frame_bottom, frame_top)
    flap_bottom, flap_top = world_z("dyn__board__flap")
    assert frame_bottom <= flap_bottom and flap_top <= frame_top, (flap_bottom, flap_top)


def test_cast_slot_names_the_person_clip_and_facing():
    import math

    from towerlib.core.naming import is_valid
    from towerlib.kit.cast_slot import cast_slot

    slot = cast_slot("desk-1", (1.0, 0.0, -0.5), character="founder-lead", clip="type", yaw_deg=90.0)
    assert slot.name == "anchor__cast__desk-1" and is_valid(slot.name)
    assert slot["character"] == "founder-lead" and slot["clip"] == "type" and slot["speed"] == 1.0
    assert abs(slot.rotation_euler.z - math.radians(90.0)) < 1e-6
    assert slot.users_collection[0].name == "anchors"
