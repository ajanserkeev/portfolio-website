import tempfile
from pathlib import Path

from towerlib import bake, export
from towerlib.core.glb import read_glb_json
from towerlib.core.naming import is_valid
from towerlib.core.spec import load_context
from towerlib.kit import anchors, primitives, props
from towerlib.kit.robot import RobotSpec, build_robot

ART = Path(__file__).resolve().parents[2]


def test_exported_glb_follows_the_level_contract():
    ctx = load_context(ART)
    primitives.plane("floor", (4.0, 4.0), color=ctx.palette["slab"])
    props.desk(ctx, "desk", (0.0, 0.0, 0.0))
    props.monitor(ctx, "mon", (0.0, 0.74, 0.0), screen_id="code")
    props.ceiling_lamp(ctx, "lamp", (0.0, 3.4, 0.0))
    build_robot(RobotSpec(id="r1", at=(1.0, 0.0, 0.0), accessory="headset", activity="typing"), ctx)
    anchors.anchor("test", (0.0, 1.0, 0.0), role="station")
    anchors.hitbox("box", (0.5, 0.5, 0.5), (0.0, 0.0, 0.0), action="noop")
    static = bake.join_static()
    bake.unwrap_lightmap(static)

    export.finalize_for_export()
    export.merge_role("screens", "screens")
    export.merge_role("glow", "glow")
    out = Path(tempfile.mkdtemp()) / "test level.glb"
    export.export_glb(out)

    gltf = read_glb_json(out)
    nodes = gltf["nodes"]
    names = {n.get("name") for n in nodes}
    assert {"static", "screens", "glow", "dyn__r1", "dyn__r1__head", "dyn__r1__face", "anchor__test", "hit__box"} <= names
    assert all(is_valid(n) for n in names), names
    meshes = {n["name"]: gltf["meshes"][n["mesh"]] for n in nodes if "mesh" in n}
    attrs = lambda name: set(meshes[name]["primitives"][0]["attributes"])  # noqa: E731
    assert {"POSITION", "COLOR_0", "TEXCOORD_0"} <= attrs("static")
    assert "TEXCOORD_0" in attrs("screens")
    assert {"NORMAL", "COLOR_0"} <= attrs("dyn__r1__body")
    assert len(meshes["screens"]["primitives"]) == 1
    assert next(n for n in nodes if n.get("name") == "dyn__r1").get("extras", {}).get("role") == "robot"
    assert "sun" not in names and "lamp-light" not in names
