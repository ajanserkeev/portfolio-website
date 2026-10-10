import pytest

from towerlib.core.naming import anchor, dyn, hit, is_valid


@pytest.mark.parametrize(
    "name",
    ["static", "screens", "glow", "dyn__op-1", "dyn__op-1__arm-l", "anchor__capsule-in", "anchor__a__b", "hit__phone"],
)
def test_contract_names_are_valid(name):
    assert is_valid(name)


@pytest.mark.parametrize(
    "name",
    ["dyn.op-1", "Static", "hit__a b", "anchor__", "dyn__op__arm__x", "screen-phone", "level.agents"],
)
def test_other_names_are_rejected(name):
    assert not is_valid(name)


def test_helpers_build_valid_names():
    assert dyn("op-1") == "dyn__op-1"
    assert dyn("op-1", "head") == "dyn__op-1__head"
    assert anchor("capsule", "in") == "anchor__capsule__in"
    assert hit("phone") == "hit__phone"


def test_helpers_reject_bad_ids():
    with pytest.raises(ValueError):
        dyn("Op 1")
    with pytest.raises(ValueError):
        hit("a.b")
