"""Node names from the level contract. '__' separates parts: GLTFLoader strips '.', ':', '/', '[', ']'."""
from __future__ import annotations

import re

NODE_NAME = re.compile(
    r"^(static|screens|glow|dyn__[a-z0-9-]+(__[a-z0-9-]+)?|anchor__[a-z0-9-]+(__[a-z0-9-]+)*|hit__[a-z0-9-]+)$"
)
_ID = re.compile(r"^[a-z0-9-]+$")


def _check(part: str) -> str:
    if not _ID.match(part):
        raise ValueError(f"bad id {part!r}: use a-z, 0-9 and '-'")
    return part


def dyn(id_: str, part: str | None = None) -> str:
    name = f"dyn__{_check(id_)}"
    return f"{name}__{_check(part)}" if part else name


def anchor(*parts: str) -> str:
    return "anchor__" + "__".join(_check(p) for p in parts)


def hit(name: str) -> str:
    return f"hit__{_check(name)}"


def is_valid(name: str) -> bool:
    return bool(NODE_NAME.match(name))
