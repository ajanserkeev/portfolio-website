import json
import struct

from towerlib.core.glb import read_glb_json


def test_reads_the_json_chunk(tmp_path):
    payload = json.dumps({"asset": {"version": "2.0"}, "nodes": [{"name": "static"}]}).encode()
    payload += b" " * ((4 - len(payload) % 4) % 4)
    data = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(payload)) + struct.pack("<I4s", len(payload), b"JSON") + payload
    path = tmp_path / "x.glb"
    path.write_bytes(data)
    assert read_glb_json(path)["nodes"][0]["name"] == "static"
