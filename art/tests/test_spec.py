import json

from towerlib.core.spec import load_context


def _write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


def test_load_context_reads_all_sources(tmp_path):
    art = tmp_path / "art"
    _write(tmp_path / "scene" / "tower.json", {"level": {"width": 12, "depth": 6, "height": 4, "slab": 0.4}, "camera": {}, "tube": {"x": 5.3, "z": 1.6, "radius": 0.2}})
    _write(art / "palette.json", {"sand": "#F3EBDD"})
    _write(art / "screens" / "manifest.json", {"width": 2048, "height": 1024, "screens": {"code": {"x": 8, "y": 8, "width": 512, "height": 640, "glow": "#202530"}}})
    _write(art / "faces" / "manifest.json", {"cols": 4, "rows": 2, "cell": 128, "frames": ["neutral", "happy"]})
    ctx = load_context(art)
    assert ctx.dims.width == 12 and ctx.dims.slab == 0.4
    assert ctx.screens["code"].rect.image_height == 1024
    assert ctx.faces.cols == 4 and ctx.faces.frames[1] == "happy"
    assert ctx.palette["sand"][0] > 0.8
