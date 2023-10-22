# sanity_check

This filter checks and fixes some of the common issues.

## Usage

At the end of a profile, add this filter, so that it can check the final state.

## Filter settings

| Property                   | Type    | Required | Default | Description                                                                |
|----------------------------|---------|----------|---------|----------------------------------------------------------------------------|
| `fail_on_warnings`         | boolean | No       | false   | Whether to fail the build on a warning                                     |
| `fail_on_errors`           | boolean | No       | true    | Whether to fail the build on an error                                      |
| `log_fixes`                | boolean | No       | true    | Whether to log information about fixes                                     |
| `fixes`                    | object  | No       |         | Object, that details which automatic fixes to apply                        |
| `fixes.remove_bom`         | boolean | No       | true    | Whether to remove BOM (Byte Order Mark) from files                         |
| `fixes.fix_property_types` | boolean | No       | true    | Whether to fix incorrect values for range and default in entity properties |                                                                                                                                                                                                                                                                 |