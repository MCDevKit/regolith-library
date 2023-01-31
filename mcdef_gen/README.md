# mcdef_gen

This filter generates [.mcdefinitions file](https://github.com/Blockception/VSCode-Bedrock-Development-Extension/blob/main/documentation/project/MCDefinitions.md), that is used to provide autocomplete and diagnostics for files, that Blockception's VSCode plugin is unable to find. Especially useful when using filters, that generate such files at runtime (such us jsonte).

## Usage

At the end of a profile, add this filter, so it can scan the actual output of the Regolith profile.