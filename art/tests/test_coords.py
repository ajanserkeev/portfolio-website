from towerlib.core.coords import place, to_blender, to_three


def test_three_to_blender_and_back():
    assert to_blender((1.0, 2.0, 3.0)) == (1.0, -3.0, 2.0)
    assert to_three(to_blender((1.0, 2.0, 3.0))) == (1.0, 2.0, 3.0)


def test_place_without_rotation_just_offsets():
    assert place((1.0, 0.5, 0.0), (2.0, 0.0, 1.0), 0.0) == (3.0, 0.5, 1.0)


def test_place_rotates_around_the_vertical_axis():
    x, y, z = place((1.0, 0.0, 0.0), (0.0, 0.0, 0.0), 90.0)
    assert abs(x) < 1e-9 and y == 0.0 and abs(z + 1.0) < 1e-9
