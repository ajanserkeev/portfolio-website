"""Roof level — Incoming: antennas catch message envelopes, funnel into pneumatic tube, and the 'Turn on agent' lever."""
from __future__ import annotations

from towerlib import rig
from towerlib.core.spec import BuildContext
from towerlib.kit import anchors, props, shell
from towerlib.kit.robot import RobotSpec, build_robot


def build(ctx: BuildContext) -> None:
    rig.daylight()
    shell.level_shell(ctx, kind="roof")
    # Open air roof deck: no ceiling occluder needed.
    shell.spine(ctx)

    tube_cfg = ctx.tower["tube"]
    tube_pos = (tube_cfg["x"], 0.0, tube_cfg["z"])

    # Intake funnel leading directly into the pneumatic tube
    props.hopper(ctx, "tube-hopper", tube_pos)

    # Big tactile "Turn on agent" lever
    props.lever_prop(ctx, "lever", (-1.2, 0.0, 0.5), action="toggle-agent", yaw_deg=-15.0)

    # Antenna array catching incoming traffic
    props.antenna_mast(ctx, "mast-left", (-4.8, 0.0, -1.8), height=3.0)
    props.antenna_mast(ctx, "mast-right", (3.2, 0.0, -2.0), height=2.4)
    props.satellite_dish(ctx, "dish-main", (-2.8, 0.0, -1.5), yaw_deg=35.0)

    # Ventilation & rooftop equipment
    props.vent_unit(ctx, "chiller", (0.8, 0.0, -1.8), yaw_deg=10.0)

    # Server cabinet / transceiver rack
    props.server_rack(ctx, "transceiver", (-5.0, 0.0, 0.5), yaw_deg=20.0, leds=6)

    # Robot engineer on the roof
    build_robot(
        RobotSpec(
            id="engineer",
            at=(-1.8, 0.0, -0.6),
            yaw_deg=25.0,
            accessory="helmet",
            activity="idle",
            accent="signal",
        ),
        ctx,
    )

    # Anchors for particle stream and lever
    anchors.anchor("incoming-stream", (0.0, 3.5, 0.0))
    anchors.anchor("lever-station", (-1.2, 0.5, 0.5))
