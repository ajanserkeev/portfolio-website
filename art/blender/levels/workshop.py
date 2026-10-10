"""Floor 1 — Workshop: assembly slipway, code & dashboard staging monitors, stage slider console, and engineering workbench."""
from __future__ import annotations

from towerlib import rig
from towerlib.core.spec import BuildContext
from towerlib.kit import props, shell
from towerlib.kit.robot import RobotSpec, build_robot


def build(ctx: BuildContext) -> None:
    rig.daylight()
    shell.level_shell(ctx, kind="floor")
    shell.ceiling_occluder(ctx)
    shell.spine(ctx)

    # Central assembly slipway
    props.assembly_slipway(ctx, "slipway", (0.0, 0.0, -0.4))

    # Staging monitors (code and dashboard screens)
    props.monitor(ctx, "mon-code", (0.0, 0.88, -0.4), screen_id="code", size=(1.0, 1.2))
    props.monitor(ctx, "mon-prod", (1.1, 0.88, -0.4), screen_id="dashboard", size=(0.65, 0.4))

    # Interactive development stage slider console in foreground
    props.stage_slider(ctx, "slider", (0.0, 0.0, 1.2), action="next-stage")

    # Engineering workbench along left wall
    props.workbench(ctx, "bench", (-4.2, 0.0, -1.0), yaw_deg=25.0)

    # Robot engineer inspecting code and components
    build_robot(
        RobotSpec(id="builder", at=(-1.4, 0.0, 0.8), yaw_deg=-30.0, accessory="helmet", activity="typing", accent="mustard"),
        ctx,
    )

    # Infrastructure: server rack, atmospheric plants and lamps
    props.server_rack(ctx, "rack", (-5.35, 0.0, -2.35))
    props.plant(ctx, "plant-1", (5.2, 0.0, -2.2))
    props.plant(ctx, "plant-2", (-5.2, 0.0, 1.8))
    for i, x in enumerate((-3.6, 0.0, 3.4)):
        props.ceiling_lamp(ctx, f"lamp-{i}", (x, 3.55, -0.6))
