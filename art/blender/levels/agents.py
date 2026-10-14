"""Floor 4 — AI agent dispatch room: operators answer chats, a sorter routes capsules, a giant phone hosts the live chat.

The style frame for every floor (plan 07e): the floor's own tone (teal wallpaper, wood wainscot,
carpet), one hero object in the middle of the back wall, light from screens and desk lamps.
"""
from __future__ import annotations

from towerlib import rig
from towerlib.core.spec import BuildContext
from towerlib.kit import anchors, decor, props, shell
from towerlib.kit.robot import RobotSpec, build_robot

ROBOT_SCALE = 1.3


def build(ctx: BuildContext) -> None:
    rig.daylight()
    shell.level_shell(ctx, kind="floor")
    shell.ceiling_occluder(ctx)
    shell.spine(ctx)
    decor.room_tone(ctx, decor.TONES["agents"])

    # Hero: the giant phone in the middle of the back wall (the live chat hotspot).
    props.wall_phone(ctx, "phone", (0.0, 0.75, shell.back_wall_z(ctx, gap=0.07)), scale=1.4)

    # The team's numbers above the operators: answered chats, response time.
    props.wall_screen(ctx, "stats", (-2.85, 1.55, shell.back_wall_z(ctx)), screen_id="dashboard", size=(1.8, 1.1))

    # Three operators in headsets, monitors turned toward the camera so the chats read.
    operators = [
        ("op-1", -3.9, -0.9, "chat-whatsapp"),
        ("op-2", -1.75, -0.9, "chat-telegram"),
        ("op-3", -3.0, 1.15, "chat-instagram"),
    ]
    for robot_id, x, z, screen in operators:
        props.desk(ctx, f"desk-{robot_id}", (x, 0.0, z))
        props.monitor(ctx, f"mon-{robot_id}", (x - 0.4, 0.74, z + 0.1), screen_id=screen, yaw_deg=28.0)
        decor.desk_lamp(ctx, f"lamp-{robot_id}", (x + 0.52, 0.74, z - 0.12))
        build_robot(
            RobotSpec(id=robot_id, at=(x + 0.1, 0.0, z - 0.8), accessory="headset", activity="typing", scale=ROBOT_SCALE),
            ctx,
        )
        anchors.anchor(f"station-{robot_id}", (x, 1.2, z))

    # Sorter on the right: capsules drop from the ceiling and leave through coloured outlets; spam to the bin.
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
        RobotSpec(
            id="sorter",
            at=(2.1, 0.0, -0.1),
            yaw_deg=35.0,
            accessory="stamp",
            activity="sorting",
            accent="mustard",
            scale=ROBOT_SCALE,
        ),
        ctx,
    )

    # Soft fill from above, out of shot: the screens and desk lamps set the mood, this keeps it readable.
    rig.area_lamp("fill-left", (-2.6, 3.5, 0.2), size=3.0, energy=140.0)
    rig.area_lamp("fill-right", (2.6, 3.5, 0.2), size=3.0, energy=140.0)
