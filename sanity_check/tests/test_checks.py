import os
import json
import sys
import importlib.util

# Load the sanity_check module directly from file to ensure relative imports work
spec = importlib.util.spec_from_file_location('sc', r'd:\\Dokumenty\\GitHub\\bedrock\\regolith-library\\sanity_check\\sanity_check.py')
import pathlib
pkg_dir = str(pathlib.Path(__file__).resolve().parents[1])
if pkg_dir not in sys.path:
    sys.path.insert(0, pkg_dir)
sc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sc)
spec = importlib.util.spec_from_file_location('sc', os.path.join(pkg_dir, 'sanity_check.py'))
from sanity_check import config as sc_config

# Ensure config defaults for tests
sc_config.config = sc_config.Config()


def write_file(path, content, binary=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    mode = 'wb' if binary else 'w'
    with open(path, mode) as f:
        if binary:
            f.write(content)
        else:
            f.write(content)


def test_has_bom_and_find_bom(tmp_path, capsys):
    bp_dir = tmp_path / "BP"
    rp_dir = tmp_path / "RP"
    bp_dir.mkdir()
    rp_dir.mkdir()

    # Create a BOM file in BP
    bom_file = bp_dir / "file.txt"
    with open(bom_file, 'wb') as f:
        f.write(b"\xef\xbb\xbfHello")

    # Run find_bom against BP and RP, expecting warning for BP
    sc.find_bom(str(bp_dir))
    sc.find_bom(str(rp_dir))


def test_find_folder_misspellings(tmp_path):
    base = tmp_path / "BP"
    base.mkdir()
    # create a valid folder
    (base / "valid").mkdir()
    # call with valid_entries that doesn't include "invalid"
    sc.find_folder_misspellings(str(base), ["valid"])


def test_find_file_misspellings(tmp_path):
    base = tmp_path / "BP"
    base.mkdir()
    (base / "folder").mkdir()
    # create a file with a small typo
    f = base / "folder" / "readme.md"
    f.write_text("ok")
    sc.find_file_misspellings(str(base), ["folder/readme1.md"])  # expects suggestion


def test_language_checks_and_translations(tmp_path):
    base = tmp_path / "BP"
    texts = base / "texts"
    texts.mkdir(parents=True)
    # create a valid language file and an invalid one
    (texts / "en_US.lang").write_text("hello=world\n")
    # Keep the filename invalid but provide valid content for parsing
    (texts / "bad.lang").write_text("foo=bar\n")
    sc.find_incorrect_language_names(str(base))
    sc.find_missing_translations(str(base))


def test_find_incorrect_property_types(tmp_path):
    # This test will create a minimal entities json to run through the parser
    entities_dir = tmp_path / "BP" / "entities"
    entities_dir.mkdir(parents=True)
    # Create a simple JSON file (valid) - property type check uses verbose_json parser
    (entities_dir / "simple.json").write_text('{}')
    # Temporarily change cwd to tmp_path so functions using relative paths work
    old_cwd = os.getcwd()
    os.chdir(str(tmp_path))
    try:
        sc.find_incorrect_property_types()
    finally:
        os.chdir(old_cwd)


def test_sound_checks(tmp_path):
    rp = tmp_path / "RP"
    sounds = rp / "sounds"
    sounds.mkdir(parents=True)
    # unsupported file
    (sounds / "sound.xyz").write_text('')
    # sound_definitions references a missing sound
    sd = rp / "sounds" / "sound_definitions.json"
    sd.write_text(json.dumps({"sound_definitions": {"s1": {"sounds": ["missing_sound"]}}}))
    old_cwd = os.getcwd()
    os.chdir(str(tmp_path))
    try:
        sc.find_unsupported_sound_files()
        sc.find_missing_sounds()
    finally:
        os.chdir(old_cwd)


def test_duplicated_recipe_ids(tmp_path):
    bp = tmp_path / "BP"
    (bp / "recipes").mkdir(parents=True)
    # create two recipe files with the same identifier
    r1 = bp / "recipes" / "r1.json"
    r2 = bp / "recipes" / "r2.json"
    r1.write_text(json.dumps({"minecraft:recipe_shaped": {"description": {"identifier": "a:b"}}}))
    r2.write_text(json.dumps({"minecraft:recipe_shapeless": {"description": {"identifier": "a:b"}}}))
    old_cwd = os.getcwd()
    os.chdir(str(tmp_path))
    try:
        sc.find_duplicated_recipe_ids()
    finally:
        os.chdir(old_cwd)
