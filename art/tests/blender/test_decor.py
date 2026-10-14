from pathlib import Path

from towerlib.core.spec import load_context
from towerlib.kit import decor
from towerlib.kit.scene import objects_in

ART = Path(__file__).resolve().parents[2]


def _ctx():
    return load_context(ART)


def _world_ys(obj):
    """three.js z of each vertex (Blender y is -z); the objects here are not rotated about x."""
    return [-(obj.location.y + v.co.y) for v in obj.data.vertices]


def _colors(obj):
    return {tuple(round(c, 4) for c in item.color[:3]) for item in obj.data.color_attributes[0].data}


def test_wallpaper_hangs_just_in_front_of_the_back_wall():
    ctx = _ctx()
    parts = {p.name: p for p in decor.room_tone(ctx, decor.TONES["agents"])}
    paper = parts["shell-wallpaper-back"]
    inner = -ctx.dims.depth / 2 + 0.2
    zs = _world_ys(paper)
    assert min(zs) >= inner - 1e-4 and max(zs) <= inner + 0.03
    tone = decor.TONES["agents"]
    assert {tuple(round(c, 4) for c in ctx.palette[name]) for name in (tone.wall, tone.stripe)} <= _colors(paper)


def test_wainscot_and_brass_rail_line_the_lower_wall():
    names = {p.name for p in decor.room_tone(_ctx(), decor.TONES["agents"])}
    assert {"shell-wainscot-back", "shell-rail-back"} <= names


def test_carpet_covers_the_floor_with_a_border():
    ctx = _ctx()
    parts = {p.name: p for p in decor.room_tone(ctx, decor.TONES["agents"])}
    carpet = parts["shell-carpet"]
    top = carpet.location.z + max(v.co.z for v in carpet.data.vertices)
    assert 0.0 < top < 0.02
    tone = decor.TONES["agents"]
    assert {tuple(round(c, 4) for c in ctx.palette[name]) for name in (tone.floor, tone.border)} <= _colors(carpet)


def test_desk_lamp_lights_the_desk_and_glows():
    ctx = _ctx()
    parts = decor.desk_lamp(ctx, "lamp-a", (0.0, 0.74, 0.0))
    assert any(p in objects_in("glow") for p in parts)
    assert any(light.name == "lamp-a-light" for light in objects_in("lights"))
