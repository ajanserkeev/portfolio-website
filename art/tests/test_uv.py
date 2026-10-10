from towerlib.core.uv import UvRect, face_cell_rect


def test_top_left_rect_maps_to_the_top_of_blender_uv_space():
    rect = UvRect(x=0, y=0, width=512, height=256, image_width=1024, image_height=1024)
    assert rect.corners_blender() == [(0.0, 0.75), (0.5, 0.75), (0.5, 1.0), (0.0, 1.0)]


def test_full_image():
    rect = UvRect(0, 0, 100, 100, 100, 100)
    assert rect.corners_blender() == [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)]


def test_face_cells_walk_rows_left_to_right():
    assert face_cell_rect(0, 4, 2, 128) == UvRect(0, 0, 128, 128, 512, 256)
    assert face_cell_rect(5, 4, 2, 128) == UvRect(128, 128, 128, 128, 512, 256)
