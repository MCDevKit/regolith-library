# packer

Packs world + BP + RP into a zip.

Settings

| **Name**       | **Type**      | **Description**                                                                                                                                                                   |
|----------------|---------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `output`       | string        | Output file name. It uses JS template literal, so you can use `${config.name}` and other properties from Regolith config.                                                         |
| `worldFolder`  | string        | The name of the world folder inside `minecraftWorlds` folder                                                                                                                      |
| `worldPath`    | string        | The path to the world folder                                                                                                                                                      |
| `worldVersion` | array\|string | The world version to set. Not specifying the field will not do anything, setting to `null` will clear the version completely and setting to `release` will set the latest release |
| `worldName`    | string        | The name of the world. It uses JS template literal, so you can use `${config.name}` and other properties from Regolith config.                                                    |