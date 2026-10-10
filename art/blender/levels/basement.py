"""Floor 0 — Basement: studio control room with the three founders, command desk, pneumatic capsule receiver dock, and server stacks."""
from __future__ import annotations

import json
from pathlib import Path

from towerlib import rig
from towerlib.core.spec import BuildContext
from towerlib.kit import props, shell
from towerlib.kit.person import PersonSpec, build_person

ART = Path(__file__).resolve().parents[2]


def build(ctx: BuildContext) -> None:
    rig.daylight()
    shell.level_shell(ctx, kind="floor")
    shell.ceiling_occluder(ctx)
    shell.spine(ctx)

    # Long command desk for the three founders
    props.command_desk(ctx, "desk", (0.0, 0.0, -0.6))

    # The three founders loaded from art/team.json
    team_data = json.loads((ART / "team.json").read_text(encoding="utf-8"))
    for member in team_data:
        spec = PersonSpec(
            id=member["id"],
            name=member["name"],
            role=member["role"],
            at=tuple(member["at"]),
            yaw_deg=member.get("yaw_deg", 0.0),
            hair=member.get("hair", "ink"),
            shirt=member.get("shirt", "teal"),
            skin=member.get("skin", "wood"),
            glasses=member.get("glasses", False),
            activity=member.get("activity", "typing"),
        )
        build_person(spec, ctx)

    # 3 developer monitors on the command desk
    props.monitor(ctx, "mon-lead", (-2.2, 0.74, -0.5), screen_id="code", yaw_deg=15.0)
    props.monitor(ctx, "mon-creative", (0.0, 0.74, -0.6), screen_id="phone", yaw_deg=0.0)
    props.monitor(ctx, "mon-auto", (2.2, 0.74, -0.5), screen_id="dashboard", yaw_deg=-15.0)

    # Pneumatic capsule dock station in foreground
    props.capsule_dock(ctx, "dock", (0.0, 0.0, 1.1), action="test-capsule")
    props.pipe(ctx, "pipe-capsule", [(0.0, 3.6, 1.1), (0.0, 0.6, 1.1)], color="brass", radius=0.08)

    # Server stacks and infrastructure
    props.server_rack(ctx, "rack-1", (-5.35, 0.0, -2.35))
    props.server_rack(ctx, "rack-2", (5.35, 0.0, -2.35))
    props.coffee_counter(ctx, "coffee", (-4.2, 0.0, 1.2), yaw_deg=45.0)
    props.plant(ctx, "plant-1", (4.8, 0.0, 1.5))
    for i, x in enumerate((-3.6, 0.0, 3.4)):
        props.ceiling_lamp(ctx, f"lamp-{i}", (x, 3.55, -0.6))
