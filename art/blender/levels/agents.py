"""Floor 4 — AI agent dispatch room: operators answer chats, a sorter routes capsules, a giant phone hosts the live chat."""
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

    # Three operators facing the camera; monitors turned toward the camera so screens read.
    operators = [
        ("op-1", -4.4, -1.0, "chat-whatsapp"),
        ("op-2", -1.9, -1.0, "chat-telegram"),
        ("op-3", -3.2, 1.0, "chat-instagram"),
    ]
    for robot_id, x, z, screen in operators:
        props.desk(ctx, f"desk-{robot_id}", (x, 0.0, z))
        props.monitor(ctx, f"mon-{robot_id}", (x - 0.45, 0.74, z + 0.1), screen_id=screen, yaw_deg=28.0)
        build_robot(RobotSpec(id=robot_id, at=(x + 0.1, 0.0, z - 0.75), accessory="headset", activity="typing"), ctx)
        anchors.anchor(f"station-{robot_id}", (x, 1.2, z))

    # Giant phone on the back wall: the live chat hotspot.
    props.wall_phone(ctx, "phone", (0.6, 0.9, -2.85))

    # Sorter on the right: capsules drop from the ceiling and leave through colored outlets.
    props.sorter(ctx, "sorter", (3.4, 0.0, -0.6), yaw_deg=-15.0)
    props.pipe(ctx, "pipe-in", [(3.4, 3.6, -0.6), (3.4, 1.25, -0.6)], color="brass")
    props.pipe(
        ctx,
        "pipe-lead",
        [(3.05, 0.2, -0.05), (3.05, 0.2, 0.6), (5.0, 0.2, 0.6), (5.0, 1.2, 1.6)],
        color="mustard",
        radius=0.06,
    )
    props.pipe(
        ctx,
        "pipe-support",
        [(3.4, 0.2, -0.1), (3.4, 0.6, 0.9), (5.0, 0.6, 1.4)],
        color="teal",
        radius=0.06,
    )
    props.trash_bin(ctx, "spam-bin", (4.3, 0.0, 0.7))
    build_robot(
        RobotSpec(id="sorter", at=(2.2, 0.0, -0.2), yaw_deg=35.0, accessory="stamp", activity="sorting", accent="mustard"),
        ctx,
    )

    # Life details.
    props.server_rack(ctx, "rack", (-5.35, 0.0, -2.35))
    props.coffee_counter(ctx, "coffee", (2.6, 0.0, -2.45))
    props.plant(ctx, "plant-1", (5.2, 0.0, -2.35))
    props.plant(ctx, "plant-2", (-5.3, 0.0, 0.8))  # clear of the lift shaft (front-left corner)
    for i, x in enumerate((-3.6, 0.0, 3.4)):
        props.ceiling_lamp(ctx, f"lamp-{i}", (x, 3.55, -0.6))
