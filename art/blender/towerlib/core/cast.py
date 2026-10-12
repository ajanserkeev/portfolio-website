"""The character cast (art/cast.json): who is in src/assets/cast.glb and which clips ship with it."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .naming import _check

# Clips that come with every Kenney Mini Characters model (1.0).
KENNEY_CLIPS = (
    "static", "idle", "walk", "sprint", "jump", "fall", "crouch", "sit", "drive", "die", "pick-up",
    "emote-yes", "emote-no", "holding-right", "holding-left", "holding-both", "holding-right-shoot",
    "holding-left-shoot", "holding-both-shoot", "attack-melee-right", "attack-melee-left",
    "attack-kick-right", "attack-kick-left", "interact-right", "interact-left", "wheelchair-sit",
    "wheelchair-look-left", "wheelchair-look-right", "wheelchair-move-forward",
    "wheelchair-move-back", "wheelchair-move-left", "wheelchair-move-right",
)
# Clips the factory keys itself (towerlib/cast_rig.py).
CUSTOM_CLIPS = ("type", "wave")


@dataclass(frozen=True)
class CastMember:
    id: str
    source: str
    role: str


@dataclass(frozen=True)
class CastSpec:
    scale: float
    clips: tuple[str, ...]
    characters: tuple[CastMember, ...]
    vendor: Path

    def source_path(self, member: CastMember) -> Path:
        return self.vendor / f"{member.source}.glb"


def load_cast(path: Path, vendor: Path) -> CastSpec:
    raw = json.loads(path.read_text(encoding="utf-8"))
    scale = float(raw["scale"])
    if not 0 < scale <= 5:
        raise ValueError(f"cast scale must be in (0, 5], got {scale}")

    clips = tuple(raw["clips"])
    unknown = [c for c in clips if c not in KENNEY_CLIPS and c not in CUSTOM_CLIPS]
    if unknown:
        raise ValueError(f"unknown clips {unknown}: use Kenney clips or {CUSTOM_CLIPS}")
    if "idle" not in clips:
        raise ValueError("the cast needs the 'idle' clip: it is the default for every slot")

    members: list[CastMember] = []
    seen: set[str] = set()
    for entry in raw["characters"]:
        member = CastMember(id=_check(entry["id"]), source=entry["source"], role=entry["role"])
        if member.id in seen:
            raise ValueError(f"duplicate cast id {member.id!r}")
        seen.add(member.id)
        if not (vendor / f"{member.source}.glb").is_file():
            raise ValueError(f"cast member {member.id!r}: no source {member.source}.glb in {vendor}")
        members.append(member)

    return CastSpec(scale=scale, clips=clips, characters=tuple(members), vendor=vendor)
