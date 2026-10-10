"""Floor 2 — Booking lounge: concierge counter, split-flap schedule board, waiting armchairs, and brass luggage cart."""
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

    # Big departure board on the back wall
    props.split_flap_board(ctx, "board", (0.0, 1.8, -2.85), screen_id="calendar")

    # Concierge reception counter
    props.concierge_desk(ctx, "concierge", (-2.2, 0.0, 0.4), action="open-booking", yaw_deg=15.0)

    # Robot concierge behind the reception desk
    build_robot(
        RobotSpec(id="concierge", at=(-2.2, 0.0, -0.4), yaw_deg=10.0, accessory="cap", activity="idle", accent="teal"),
        ctx,
    )

    # Brass luggage trolley cart
    props.luggage_trolley(ctx, "trolley", (-4.6, 0.0, -1.2), yaw_deg=35.0)

    # Waiting lounge armchairs and refreshment table
    props.lounge_chair(ctx, "chair-1", (3.2, 0.0, -0.6), color="teal", yaw_deg=-30.0)
    props.lounge_chair(ctx, "chair-2", (4.4, 0.0, 0.4), color="mustard", yaw_deg=-60.0)
    props.coffee_counter(ctx, "side-table", (3.8, 0.0, -2.2), yaw_deg=-15.0)

    # Station clock on side wall
    props.wall_clock(ctx, "clock", (-5.45, 2.4, 0.2), yaw_deg=90.0)

    # Atmosphere: decorative plants and ceiling lamps
    props.plant(ctx, "plant-1", (-5.2, 0.0, 1.8))
    props.plant(ctx, "plant-2", (5.2, 0.0, -2.2))
    for i, x in enumerate((-3.6, 0.0, 3.4)):
        props.ceiling_lamp(ctx, f"lamp-{i}", (x, 3.55, -0.6))
