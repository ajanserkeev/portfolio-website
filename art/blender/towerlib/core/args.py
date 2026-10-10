from __future__ import annotations


def script_args(argv: list[str]) -> list[str]:
    """Blender passes script arguments after '--'."""
    return argv[argv.index("--") + 1 :] if "--" in argv else []
