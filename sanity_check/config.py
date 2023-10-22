import json


class Fixes(object):
    def __init__(self, remove_bom=True, fix_property_types=True):
        self.remove_bom = remove_bom
        self.fix_property_types = fix_property_types


class Config(object):
    def __init__(self, fail_on_warnings=False, fail_on_errors=True, log_fixes=True, fixes={}):
        self.fail_on_warnings = fail_on_warnings
        self.fail_on_errors = fail_on_errors
        self.log_fixes = log_fixes
        self.fixes = Fixes(**fixes)


def load_config():
    """Load configuration from sys.argv provided by regolith."""
    try:
        return json.loads(sys.argv[1], object_hook=lambda d: Config(**d))
    except Exception:
        return Config()


config = load_config()
