import pytest

from towerlib.core.bricks import brick_grid, shade

W, H = 6.0, 3.6


def test_grid_covers_the_wall_exactly():
    grid = brick_grid(W, H)
    assert grid.xs[0] == 0.0 and grid.xs[-1] == pytest.approx(W)
    assert grid.ys[0] == 0.0 and grid.ys[-1] == pytest.approx(H)
    assert all(a < b for a, b in zip(grid.xs, grid.xs[1:]))
    assert all(a < b for a, b in zip(grid.ys, grid.ys[1:]))


def test_brick_rows_are_separated_by_mortar_rows():
    grid = brick_grid(W, H)
    kinds = ["mortar" if all(grid.cell(c, r) is None for c in range(len(grid.xs) - 1)) else "brick" for r in range(len(grid.ys) - 1)]
    assert kinds[0] == "brick"
    assert all(not (a == "mortar" and b == "mortar") for a, b in zip(kinds, kinds[1:]))
    assert all(not (a == "brick" and b == "brick") for a, b in zip(kinds, kinds[1:]))


def _vertical_joints(grid, row):
    """x centres of mortar cells in a brick row."""
    return {round((grid.xs[c] + grid.xs[c + 1]) / 2, 4) for c in range(len(grid.xs) - 1) if grid.cell(c, row) is None}


def test_neighbouring_brick_rows_are_staggered():
    grid = brick_grid(W, H)
    first, second = _vertical_joints(grid, 0), _vertical_joints(grid, 2)
    assert first and second
    assert first.isdisjoint(second)


def test_a_brick_keeps_its_number_along_its_length():
    grid = brick_grid(W, H, brick=(0.36, 0.15), mortar=0.025)
    ids = [grid.cell(c, 0) for c in range(len(grid.xs) - 1)]
    runs = [i for i in ids if i is not None]
    # Consecutive cells of one brick share an id, and the next brick gets a new one.
    assert len(set(runs)) >= int(W / 0.385)
    first = ids.index(runs[0])
    assert ids[first + 1] in (runs[0], None)


def test_shade_is_deterministic_and_small():
    assert [shade(i) for i in range(50)] == [shade(i) for i in range(50)]
    assert {shade(i) for i in range(200)} == {0, 1, 2}
