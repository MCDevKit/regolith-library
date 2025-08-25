import json
import sys


class Fixes(object):
    def __init__(self, remove_bom=True, fix_property_types=True):
        self.remove_bom = remove_bom
        self.fix_property_types = fix_property_types


class Checks(object):
    """Individual toggles for each sanity check.

    Usage in config JSON:
    {
      "checks": {
        "all_checks": false,
        "find_bom_bp": true,
        "find_bom_rp": true
      }
    }

    If `all_checks` is provided, it will be applied to all checks and then
    any specifically provided check flags will override it.
    """

    def __init__(
        self,
        all_checks=None,
        find_bom_bp=True,
        find_bom_rp=True,
        folder_misspellings_bp=True,
        folder_misspellings_rp=True,
        file_misspellings_bp=True,
        file_misspellings_rp=True,
        incorrect_language_names_bp=True,
        incorrect_language_names_rp=True,
        missing_translations_bp=True,
        missing_translations_rp=True,
        incorrect_property_types=True,
        duplicated_recipe_ids=True,
        unsupported_sound_files=True,
        missing_sounds=True,
        **kwargs
    ):
        # start with defaults
        defaults = {
            "find_bom_bp": find_bom_bp,
            "find_bom_rp": find_bom_rp,
            "folder_misspellings_bp": folder_misspellings_bp,
            "folder_misspellings_rp": folder_misspellings_rp,
            "file_misspellings_bp": file_misspellings_bp,
            "file_misspellings_rp": file_misspellings_rp,
            "incorrect_language_names_bp": incorrect_language_names_bp,
            "incorrect_language_names_rp": incorrect_language_names_rp,
            "missing_translations_bp": missing_translations_bp,
            "missing_translations_rp": missing_translations_rp,
            "incorrect_property_types": incorrect_property_types,
            "duplicated_recipe_ids": duplicated_recipe_ids,
            "unsupported_sound_files": unsupported_sound_files,
            "missing_sounds": missing_sounds,
        }

        # apply global override if provided
        if all_checks is not None:
            for k in defaults:
                defaults[k] = all_checks

        # override with any explicitly provided keyword args
        for k, v in kwargs.items():
            if k in defaults:
                defaults[k] = v

        # set attributes
        for k, v in defaults.items():
            setattr(self, k, v)

    def is_enabled(self, name):
        """Return the boolean value of the named check toggle.

        We intentionally do not accept a default here — defaults are defined
        on the Checks class itself during construction.
        """
        return getattr(self, name)


class Config(object):
    def __init__(self, fail_on_warnings=False, fail_on_errors=True, log_fixes=True, fixes={}, checks={}):
        self.fail_on_warnings = fail_on_warnings
        self.fail_on_errors = fail_on_errors
        self.log_fixes = log_fixes
        self.fixes = Fixes(**fixes)
        self.checks = Checks(**checks)


def load_config():
    """Load configuration from sys.argv provided by regolith."""
    try:
        # Parse the JSON into plain dicts first, then construct a Config from
        # the top-level dict. Avoid using object_hook which would call
        # Config(**d) for every nested dict.
        data = json.loads(sys.argv[1])
        return Config(**data)
    except Exception:
        return Config()


config = load_config()
