"""Floor 3 — CRM sorting hall: conveyor belt, stamping press, deal trigger button, and pipeline kanban."""
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

    # Conveyor belt across the central hall floor
    props.conveyor(ctx, "conveyor", (-0.6, 0.0, 0.2), length=4.4, width=0.8, height=0.75)

    # Stamping machine positioned over the conveyor belt
    props.stamp_machine(ctx, "stamp", (-0.6, 0.0, 0.2))

    # Big red "Run Deal" interactive button console in foreground right
    props.deal_button(ctx, "deal", (2.2, 0.0, 1.0), action="run-deal", yaw_deg=-15.0)

    # Wall kanban screen displaying the live CRM pipeline stages
    props.wall_screen(ctx, "kanban", (-0.6, 1.8, shell.back_wall_z(ctx)), screen_id="crm-kanban", size=(1.6, 1.0))

    # Filing cabinets along the back-left wall (CRM customer records)
    props.filing_cabinet(ctx, "cabinet-1", (-4.2, 0.0, -2.1), yaw_deg=15.0)
    props.filing_cabinet(ctx, "cabinet-2", (-3.1, 0.0, -2.3), yaw_deg=10.0)

    # Integration conduits (amoCRM, Bitrix24, n8n/1C) routing from ceiling into conveyor/cabinets
    props.pipe(
        ctx,
        "pipe-amocrm",
        [(-2.4, 3.6, -1.8), (-2.4, 1.4, -1.8), (-1.2, 1.4, -0.6), (-1.2, 0.8, 0.1)],
        color="teal",
        radius=0.06,
    )
    props.pipe(
        ctx,
        "pipe-bitrix",
        [(-2.0, 3.6, -2.0), (-2.0, 1.6, -2.0), (-0.7, 1.6, -0.6), (-0.7, 0.8, 0.1)],
        color="steel",
        radius=0.05,
    )
    props.pipe(
        ctx,
        "pipe-n8n",
        [(0.8, 3.6, -2.0), (0.8, 1.5, -1.2), (0.1, 1.5, -0.6), (0.1, 0.8, 0.1)],
        color="mustard",
        radius=0.05,
    )

    # Robot operator inspecting deals at the conveyor
    build_robot(
        RobotSpec(id="inspector", at=(0.9, 0.0, -0.7), yaw_deg=165.0, accessory="stamp", activity="sorting", accent="mustard"),
        ctx,
    )

    # Environment details: desk, dashboard monitor, server rack, plant, lamps
    props.desk(ctx, "desk-crm", (4.1, 0.0, -0.9), yaw_deg=-25.0)
    props.monitor(ctx, "mon-crm", (3.9, 0.74, -0.8), screen_id="dashboard", yaw_deg=20.0)
    props.server_rack(ctx, "rack-crm", (-5.35, 0.0, -2.35))
    props.plant(ctx, "plant-crm", (5.2, 0.0, 1.8))
    for i, x in enumerate((-3.6, 0.0, 3.4)):
        props.ceiling_lamp(ctx, f"lamp-{i}", (x, 3.55, -0.6))
