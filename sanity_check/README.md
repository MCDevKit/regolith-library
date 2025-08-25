# sanity_check

This filter checks and fixes some of the common issues.

## Usage

At the end of a profile, add this filter, so that it can check the final state.

## Filter settings

| Property           | Type    | Required | Default | Description                                                    |
| ------------------ | ------- | -------- | ------- | -------------------------------------------------------------- |
| `fail_on_warnings` | boolean | No       | false   | Whether to fail the build on a warning                         |
| `fail_on_errors`   | boolean | No       | true    | Whether to fail the build on an error                          |
| `log_fixes`        | boolean | No       | true    | Whether to log information about fixes                         |
| `fixes`            | object  | No       |         | Object that details which automatic fixes to apply (see below) |
| `checks`           | object  | No       |         | Object that enables/disables individual checks (see below)     |

### Fixes

Settings for automatic fixes available to this filter.

| Property             | Type    | Required | Default | Description                                                                |
| -------------------- | ------- | -------- | ------- | -------------------------------------------------------------------------- |
| `remove_bom`         | boolean | No       | true    | Whether to remove BOM (Byte Order Mark) from files                         |
| `fix_property_types` | boolean | No       | true    | Whether to fix incorrect values for range and default in entity properties |


### Checks

You can enable/disable individual sanity checks using the `checks` object.

`checks` supports an `all_checks` boolean which, if provided, will set all
checks to that value, and then any individual check flags in the same object
can override it.

Available toggles:

| Property                      | Type    | Default | Description                                                                                         |
| ----------------------------- | ------- | ------- | --------------------------------------------------------------------------------------------------- |
| `all_checks`                  | boolean | -       | Global override for all checks. If present, applies to all checks then individual flags override it |
| `find_bom_bp`                 | boolean | true    | Run BOM check for BP pack                                                                           |
| `find_bom_rp`                 | boolean | true    | Run BOM check for RP pack                                                                           |
| `folder_misspellings_bp`      | boolean | true    | Check BP folders for misspellings                                                                   |
| `folder_misspellings_rp`      | boolean | true    | Check RP folders for misspellings                                                                   |
| `file_misspellings_bp`        | boolean | true    | Check BP files for misspellings                                                                     |
| `file_misspellings_rp`        | boolean | true    | Check RP files for misspellings                                                                     |
| `incorrect_language_names_bp` | boolean | true    | Validate language file names in BP                                                                  |
| `incorrect_language_names_rp` | boolean | true    | Validate language file names in RP                                                                  |
| `missing_translations_bp`     | boolean | true    | Check for missing translations in BP                                                                |
| `missing_translations_rp`     | boolean | true    | Check for missing translations in RP                                                                |
| `incorrect_property_types`    | boolean | true    | Check/fix property type issues in BP entities                                                       |
| `duplicated_recipe_ids`       | boolean | true    | Check for duplicated recipe IDs in BP                                                               |
| `unsupported_sound_files`     | boolean | true    | Detect unsupported sound file extensions in RP                                                      |
| `missing_sounds`              | boolean | true    | Detect missing sound files referenced by sound_definitions.json                                     |
