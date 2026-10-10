from towerlib.core.args import script_args


def test_returns_arguments_after_the_double_dash():
    assert script_args(["blender", "-b", "-P", "x.py", "--", "--level", "agents"]) == ["--level", "agents"]


def test_returns_empty_list_without_double_dash():
    assert script_args(["blender", "-b"]) == []
