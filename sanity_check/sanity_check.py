# coding=utf-8
import os
import json
import sys
import data
import config
import utils
import verbose_json


def warn(msg):
    print("[WARNING] " + msg)
    if config.config.fail_on_warnings:
        sys.exit(1)


def log_fix(msg):
    if config.config.log_fixes:
        print("[FIX] " + msg)


def error(msg):
    print("[ERROR] " + msg)
    if config.config.fail_on_errors:
        sys.exit(1)


def find_bom(base_path):
    files = utils.list_files_with_extension(base_path, data.BOM_EXTENSIONS)
    for f in files:
        if has_bom(f):
            if config.config.fixes.remove_bom:
                log_fix(f"Removing BOM from {f}.")
                content = None
                with open(f, "rb") as file:
                    file.read(3)
                    content = file.read()
                with open(f, "wb", encoding="utf8") as file:
                    file.write(content)
            else:
                warn(f"{f} has a BOM. This is not allowed.")


def find_folder_misspellings(base_path, valid_entries):
    directories = [
        d for d in os.listdir(base_path) if os.path.isdir(os.path.join(base_path, d))
    ]
    for directory in directories:
        if directory not in valid_entries:
            closest, distance = utils.find_closest(directory, valid_entries)
            if distance > data.MISSPELLING_THRESHOLD:
                continue
            warn(
                f"{base_path}{os.path.sep}{directory} is not a valid folder. Did you mean {base_path}{os.path.sep}{closest}?"
            )


def find_file_misspellings(base_path, valid_entries):
    for entry in valid_entries:
        if os.path.isdir(os.path.join(base_path, entry)):
            continue
        if not os.path.exists(os.path.join(base_path, entry)):
            parent = os.path.dirname(entry)
            name = os.path.basename(entry)
            if not os.path.exists(os.path.join(base_path, parent)):
                continue
            files = [
                f
                for f in os.listdir(os.path.join(base_path, parent))
                if not os.path.isdir(os.path.join(base_path, parent, f))
                and os.path.join(parent, f) not in valid_entries
            ]
            closest, distance = utils.find_closest(name, files)
            if distance is None or distance > data.MISSPELLING_THRESHOLD:
                continue
            warn(
                f"{base_path}{(os.path.sep if parent != '' else '')}{parent}{os.path.sep}{closest} is not a valid file. Did you mean {base_path}{os.path.sep}{entry}?"
            )


def find_incorrect_language_names(base_path):
    if not os.path.exists(os.path.join(base_path, "texts")):
        return
    files = [
        f
        for f in os.listdir(os.path.join(base_path, "texts"))
        if not os.path.isdir(os.path.join(base_path, f) and f.endswith(".lang"))
    ]
    for file in files:
        split = file.split(".")[0].split("_")
        if len(split) != 2:
            warn(
                f"{base_path}{os.path.sep}texts{os.path.sep}{file} is not a valid language file."
            )
            continue
        language = split[0]
        country = split[1]
        if language not in data.languages:
            warn(
                f"{base_path}{os.path.sep}texts{os.path.sep}{file} is not a valid language file. {language} is not a valid language."
            )
            continue
        if country not in data.countries:
            warn(
                f"{base_path}{os.path.sep}texts{os.path.sep}{file} is not a valid language file. {country} is not a valid country."
            )
            continue


def load_lang_file(path):
    with open(path, "r", encoding="utf8") as f:
        lines = f.readlines()
        lang_dict = {}
        for line in lines:
            # Ignore comments and blank lines
            if line.startswith("#") or not line.strip():
                continue
            key, value = line.split("=", 1)
            lang_dict[key] = value
        return lang_dict
    return {}


def find_missing_translations(base_path):
    if not os.path.exists(os.path.join(base_path, "texts")):
        return
    files = [
        f
        for f in os.listdir(os.path.join(base_path, "texts"))
        if not os.path.isdir(os.path.join(base_path, f) and f.endswith(".lang"))
    ]
    lang_dict = {}
    all_keys = set()
    for file in files:
        lang_dict[file] = load_lang_file(os.path.join(base_path, "texts", file))
        all_keys.update(lang_dict[file].keys())

    for key in all_keys:
        for file in files:
            if key not in lang_dict[file]:
                warn(
                    f"{base_path}{os.path.sep}texts{os.path.sep}{file} is missing translation for {key}."
                )


def find_incorrect_property_types(base_path):
    if not os.path.exists(os.path.join(base_path, "entities")):
        return
    files = utils.list_files_with_extension(
        os.path.join(base_path, "entities"), ["json"]
    )
    for file in files:
        text = None
        with open(file, "r", encoding="utf8") as f:
            text = f.read()
            listener = verbose_json.PropertyListener(text)
            verbose_json.parseJson(text, listener)
            for element in listener.issueList:
                warn(f"{file} has an incorrect value type. {element.message}.")
                if config.config.fixes.fix_property_types and element.can_fix():
                    log_fix(element.message)
                    text = element.fixFunc(text)

        if config.config.fixes.fix_property_types:
            with open(file, "w") as f:
                f.write(text)


def has_bom(path):
    with open(path, "rb") as f:
        return f.read(3) == b"\xef\xbb\xbf"


if __name__ == "__main__":
    find_bom("BP")
    find_bom("RP")
    find_folder_misspellings("BP", data.BP_FOLDERS)
    find_folder_misspellings("RP", data.RP_FOLDERS)
    find_file_misspellings("BP", data.BP_FILES)
    find_file_misspellings("RP", data.RP_FILES)
    find_incorrect_language_names("BP")
    find_incorrect_language_names("RP")
    find_missing_translations("BP")
    find_missing_translations("RP")
    find_incorrect_property_types("BP")
