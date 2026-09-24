# validate

Performs mctools.dev validation on the pack using the
[`@minecraft/creator-tools`](https://www.npmjs.com/package/@minecraft/creator-tools)
library (the same engine as `npx mct validate`).

The validation rules and reference data (JSON schemas from
`@minecraft/bedrock-schemas`, vanilla definitions, forms) ship inside the npm
package, nothing is downloaded at validation time. To pick up new rules, bump
the `@minecraft/creator-tools` version in `package.json`.

## Settings

| **Name**       | **Type**  | **Description**                                                                                              |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `suite`        | `string`  | The suite to run: `addon` (default), `default`/`main`, `currentplatform`, `sharing`, `sharingstrict`, `all`. |
| `exclusions`   | `array`   | Validator ids to skip entirely, e.g. `["PATHLENGTH", "PACKSIZE"]`.                                           |
| `failOnError`  | `boolean` | Fail the run if there are any errors.                                                                        |
| `annoyance`    | `string`  | Annoyance to show to make sure the user knows something went wrong (`none` or `alert`).                      |
| `logOverrides` | `array`   | Overrides for log messages. Usually used to ignore certain errors.                                           |
| `outputFolder` | `string`  | Where to write the HTML/CSV/JSON reports, relative to the pack root. Default `./mct-output/`.                 |

`all` mirrors the CLI: it runs the default suite and then every derived suite
(`addon` if the project looks like an add-on, `sharing`, and `currentplatform`
when applicable), and reports errors from all of them.

Errors reported against Regolith's `data/` folder are ignored, since that folder
is not part of the exported pack.

### Log Overrides

| **Name**   | **Type** | **Description**   |
| ---------- | -------- | ----------------- |
| `match`    | `object` | The log to match. |
| `override` | `object` | The override.     |

### Log Match

| **Name** | **Type** | **Description**                                            |
| -------- | -------- | ---------------------------------------------------------- |
| `level`  | `string` | The level of the log: `error`, `warning`, `info`, `recommendation`. |
| `error`  | `string` | The validator id. E.g. `UNKJSON`, `CADDONIREQ`.            |
| `id`     | `number` | The id of the log within that validator.                   |
| `p`      | `string` | The pack-relative path of the offending file.              |
| `d`      | `any`    | The extra data attached to the log (e.g. an identifier).   |

The validator id and log id for every reported error can be looked up in
`mct-output/<pack>.mcr.json` (fields `gId` and `gIx`).

## Example

```json
{
  "suite": "addon",
  "annoyance": "alert",
  "failOnError": true,
  "exclusions": ["PACKSIZE"],
  "logOverrides": [
    {
      //This will downgrade "Resource animation identifier is not in the expected form of animation.xyz.animation_name" to a warning.
      "match": {
        "level": "error",
        "error": "CADDONIREQ",
        "id": 130
      },
      "override": {
        "level": "warning"
      }
    }
  ]
}
```

## Changelog

### 1.1.0

- Updated `@minecraft/creator-tools` from 0.10.1 to 0.18.0 and switched to its
  public `lib/` API instead of the old worker-thread workaround.
- Fixed JSON schema validation not loading schemas when run as a library.
- Added `exclusions` setting to skip validators by id.
- Added `outputFolder` setting; an empty string disables report generation.
- Added `sharing` and `sharingstrict` suites. `all` now runs the default suite
  plus every derived suite and reports errors from all of them.
- Errors reported against Regolith's `data/` folder by absolute path are now
  ignored, same as pack-relative `/data/` paths.
- `logOverrides` `level` accepts `recommendation`.

### 1.0.2

- Clean output folder on initialization.

### 1.0.1

- Added `logOverrides` to ignore or downgrade certain errors.

### 1.0.0

- Initial release.
