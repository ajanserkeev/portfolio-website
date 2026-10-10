import json
from pathlib import Path

from towerlib.core.camera import apparent_width, camera_pose

ROOT = Path(__file__).resolve().parents[2]


def test_apparent_width():
    assert abs(apparent_width(12, 6, 0) - 12) < 1e-9
    assert abs(apparent_width(12, 6, 90) - 6) < 1e-9


def test_matches_the_site_camera_fixtures():
    tower = json.loads((ROOT / "scene" / "tower.json").read_text(encoding="utf-8"))
    fixtures = json.loads((ROOT / "scene" / "camera-fixtures.json").read_text(encoding="utf-8"))
    for case in fixtures["cases"]:
        position, target = camera_pose(case["lift"], case["viewport"]["width"], case["viewport"]["height"], tower)
        for got, want in zip(position + target, case["position"] + case["target"]):
            assert abs(got - want) < 1e-6, (case, position, target)
