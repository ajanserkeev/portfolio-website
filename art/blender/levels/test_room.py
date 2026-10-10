"""Small level for pipeline tests. Not shipped (its id is not in scene/tower.json)."""
from __future__ import annotations

from towerlib import rig
from towerlib.core.spec import BuildContext
from towerlib.kit import anchors, props, shell
from towerlib.kit.robot import RobotSpec, build_robot


def build(ctx: BuildContext) -> None:
    rig.daylight()
    shell.level_shell(ctx, kind="floor")
    shell.ceiling_occluder(ctx)
    shell.spine(ctx)
    props.desk(ctx, "desk", (-1.5, 0.0, -1.0))
    props.monitor(ctx, "mon", (-1.9, 0.74, -0.95), screen_id="code", yaw_deg=25.0)
    props.ceiling_lamp(ctx, "lamp", (0.0, 3.5, -0.5))
    props.plant(ctx, "plant", (4.5, 0.0, -2.2))
    build_robot(RobotSpec(id="op-1", at=(-1.5, 0.0, -1.7), accessory="headset", activity="typing"), ctx)
    anchors.anchor("station-1", (-1.5, 1.0, -1.0))
