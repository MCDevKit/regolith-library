# validate

Performs mctools.dev validation on the pack.

## Settings

| **Name**       | **Type**  | **Description**                                                     |
| -------------- | --------- | ------------------------------------------------------------------- |
| `suite`        | `string`  | The suite to run.                                                   |
| `failOnError`  | `boolean` | Fail the run if there are any errors.                               |
| `annoyance`    | `string`  | Annoyance to show to make sure the user knows something went wrong. |
| `logOverrides` | `array`   | Overrides for log messages. Usually used to ignore certain errors.  |

### Log Overrides

| **Name**   | **Type** | **Description**   |
| ---------- | -------- | ----------------- |
| `match`    | `object` | The log to match. |
| `override` | `object` | The override.     |

### Log Match

| **Name** | **Type** | **Description**               |
| -------- | -------- | ----------------------------- |
| `level`  | `string` | The level of the log.         |
| `error`  | `string` | The error name. E.g. UNKJSON. |
| `id`     | `number` | The id of the log.            |

## Example

```json
{
  "suite": "addon",
  "annoyance": "alert",
  "failOnError": true,
  "logOverrides": [
    {
      //This will ignore "Found a loose file in the item_catalog folder. Should only see files in the folder item_catalog\creatorshortname\gamename\" error.
      "match": {
        "level": "error",
        "error": "CADDONREQ",
        "id": 101,
        "d": "crafting_item_catalog.json"
      },
      "override": {
        "level": "warning"
      }
    }
  ]
}
```