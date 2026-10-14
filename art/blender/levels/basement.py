"""Floor 0 — Basement: the studio's control desk. The three founders (cast members) type at a long
desk facing the camera, wall screens behind them, the capsule dock in front."""
from __future__ import annotations

from towerlib import rig
from towerlib.core.spec import BuildContext
from towerlib.kit import props, shell
from towerlib.kit.cast_slot import cast_slot
from towerlib.kit.office import SEATED_ANCHOR_Y, keyboard, office_chair

# (cast id, x, yaw toward the middle, typing speed, chair colour)
FOUNDERS = (
    ("founder-lead", -1.6, 12.0, 1.0, "teal"),
    ("founder-creative", 0.0, 0.0, 1.15, "mustard"),
    ("founder-automation", 1.6, -12.0, 0.9, "signal"),
)
DESK_Z = -0.45
SEAT_Z = -1.3


def build(ctx: BuildContext) -> None:
    rig.daylight()
    shell.level_shell(ctx, kind="floor")
    shell.ceiling_occluder(ctx)
    shell.spine(ctx)

    # Long control desk; the founders sit behind it, so their faces are towards the camera.
    props.command_desk(ctx, "desk", (0.0, 0.0, DESK_Z), width=4.8, depth=0.9)
    for cast_id, x, yaw, speed, color in FOUNDERS:
        slot = cast_id.removeprefix("founder-")
        office_chair(ctx, f"chair-{slot}", (x, 0.0, SEAT_Z), color=color, yaw_deg=yaw)
        keyboard(ctx, f"keyboard-{slot}", (x, 0.74, DESK_Z - 0.2))
        cast_slot(slot, (x, SEATED_ANCHOR_Y, SEAT_Z), character=cast_id, clip="type", yaw_deg=yaw, speed=speed)

    # The tower's dashboards on the wall behind them.
    for name, x, screen in (("left", -2.0, "code"), ("middle", 0.0, "dashboard"), ("right", 2.0, "crm-kanban")):
        props.wall_screen(ctx, f"wall-{name}", (x, 1.65, shell.back_wall_z(ctx)), screen_id=screen, size=(1.4, 0.85))

    # Pneumatic capsule dock, front right (clear of the founders): the visitor's capsule lands here.
    props.capsule_dock(ctx, "dock", (3.0, 0.0, 0.9), action="test-capsule")
    props.pipe(ctx, "pipe-capsule", [(3.0, 3.6, 0.9), (3.0, 0.6, 0.9)], color="brass", radius=0.08)

    props.server_rack(ctx, "rack-1", (-5.35, 0.0, -2.35))
    props.server_rack(ctx, "rack-2", (5.35, 0.0, -2.35))
    props.coffee_counter(ctx, "coffee", (-3.6, 0.0, 0.9), yaw_deg=30.0)  # clear of the lift shaft
    props.plant(ctx, "plant-1", (4.8, 0.0, 1.5))
    for i, x in enumerate((-3.6, 0.0, 3.4)):
        props.ceiling_lamp(ctx, f"lamp-{i}", (x, 3.55, -0.6))
