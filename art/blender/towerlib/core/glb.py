from __future__ import annotations

import json
import struct
from pathlib import Path


def read_glb_json(path: Path | str) -> dict:
    data = Path(path).read_bytes()
    magic, _version, _length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF":
        raise ValueError(f"{path} is not a GLB file")
    chunk_length, chunk_type = struct.unpack_from("<I4s", data, 12)
    if chunk_type != b"JSON":
        raise ValueError(f"{path}: first chunk is not JSON")
    return json.loads(data[20 : 20 + chunk_length])
