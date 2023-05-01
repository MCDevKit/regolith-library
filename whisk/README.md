# whisk

This filter copies remote git repos into current addon.

## Usage

At the beginning of a profile, add this filter, so other filters can properly process copied files.

## Filter settings

| Property            | Type    | Required | Default | Description                                                                                                                                                                                                                                                                                                                                                  |
|---------------------|---------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `modules`           | array   | Yes      | N/A     | An array of modules to include.                                                                                                                                                                                                                                                                                                                              |
| `modules[].name`    | string  | Yes      | N/A     | The URL of the git repo to include. For GitHub repos, the URL can be in `user/repo` format. After the URL, directory can be specified to include only a specific directory from the repo. For example, `user/repo/dir` will include only the `dir` directory from the `user/repo` repo. If the directory is not specified, the entire repo will be included. |
| `modules[].version` | string  | No       | `HEAD`  | The version of the module to include. If not specified, `HEAD` will be used.                                                                                                                                                                                                                                                                                 |
| `debug`             | boolean | No       | false   | Whether to include debug information in the output.                                                                                                                                                                                                                                                                                                          |
| `fetchDelay`        | number  | No       | 5       | The delay in minutes between fetches of the git repos. Can be set to 0 to disable delay.                                                                                                                                                                                                                                                                     |

## Whisk module config

Module config is stored in `whisk.json` file in the root of the module. The file is a JSON object with the following properties:

| Property  | Type   | Required | Default    | Description                   |
|-----------|--------|----------|------------|-------------------------------|
| `include` | array  | No       | `["**/*"]` | An array of files to include. |
| `exclude` | string | No       | N/A        | An array of files to exclude. |