import json

import pytest

from towerlib.core.cast import CUSTOM_CLIPS, load_cast


def _setup(tmp_path, **overrides):
    vendor = tmp_path / "vendor"
    vendor.mkdir()
    for source in ("character-male-a", "character-female-b"):
        (vendor / f"{source}.glb").write_bytes(b"glTF")
    spec = {
        "scale": 1.45,
        "clips": ["idle", "walk", "type"],
        "characters": [
            {"id": "founder-lead", "source": "character-male-a", "role": "founder"},
            {"id": "guest", "source": "character-female-b", "role": "client"},
        ],
    }
    spec.update(overrides)
    path = tmp_path / "cast.json"
    path.write_text(json.dumps(spec), encoding="utf-8")
    return path, vendor


def test_reads_a_valid_cast(tmp_path):
    cast = load_cast(*_setup(tmp_path))
    assert cast.scale == 1.45
    assert [c.id for c in cast.characters] == ["founder-lead", "guest"]
    assert cast.characters[0].source == "character-male-a"
    assert cast.clips == ("idle", "walk", "type")
    assert set(CUSTOM_CLIPS) == {"type", "wave"}


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"characters": [{"id": "a", "source": "character-male-a", "role": "x"}] * 2}, "duplicate"),
        ({"characters": [{"id": "x", "source": "character-male-z", "role": "x"}]}, "character-male-z"),
        ({"characters": [{"id": "lead.one", "source": "character-male-a", "role": "x"}]}, "lead.one"),
        ({"clips": ["idle", "moonwalk"]}, "moonwalk"),
        ({"clips": ["walk"]}, "idle"),
        ({"scale": 0}, "scale"),
    ],
)
def test_rejects_a_broken_cast(tmp_path, overrides, message):
    with pytest.raises(ValueError, match=message):
        load_cast(*_setup(tmp_path, **overrides))


def test_the_repository_cast_is_valid():
    from pathlib import Path

    art = Path(__file__).resolve().parents[1]
    cast = load_cast(art / "cast.json", art / "vendor" / "kenney-mini-characters")
    assert len(cast.characters) >= 3
