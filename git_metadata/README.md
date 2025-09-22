# git_metadata filter

Writes Git metadata for the current repository to packs/data/git_metadata/meta.json, so in-game or downstream tooling can consume it.

## Output

The filter produces a JSON document containing:
- commit: current commit hash.
- tag: present only when the HEAD commit matches a tag (exactly).
- branch: current branch name when available.
- dirty (boolean): true if there are uncommitted changes in the working directory.

The output folder is created automatically if it does not exist.
