import math

from towerlib.core.paths import round_corners


def _length(points):
    return sum(math.dist(a, b) for a, b in zip(points, points[1:]))


def test_straight_lines_are_unchanged():
    line = [(0.0, 0.0, 0.0), (1.0, 0.0, 0.0), (2.0, 0.0, 0.0)]
    assert round_corners(line, 0.3) == line


def test_corner_is_replaced_by_an_arc():
    path = [(0.0, 0.0, 0.0), (0.0, 2.0, 0.0), (2.0, 2.0, 0.0)]
    rounded = round_corners(path, 0.5, segments=6)
    assert rounded[0] == path[0] and rounded[-1] == path[-1]
    assert (0.0, 2.0, 0.0) not in rounded
    assert len(rounded) == 2 + 7
    assert _length(rounded) < _length(path)


def test_radius_is_limited_by_short_segments():
    path = [(0.0, 0.0, 0.0), (0.0, 0.2, 0.0), (2.0, 0.2, 0.0)]
    rounded = round_corners(path, 5.0, segments=4)
    assert all(p[1] >= -1e-9 for p in rounded)
