import subprocess
import json
import sys
from pathlib import Path

repo_dir = Path("bedrock-samples")

if not repo_dir.is_dir():
    # Clone repo
    try:
        subprocess.run([
            "git",
            "clone",
            "-b",
            "preview",
            "--depth",
            "1",
            "https://github.com/Mojang/bedrock-samples.git",
        ], cwd=".", check=True)
    except subprocess.CalledProcessError as e:
        print(f"Git clone failed: {e}", file=sys.stderr)
        sys.exit(1)
else:
    # Pull latest changes
    try:
        subprocess.run(["git", "pull"], cwd=str(repo_dir), check=True)
    except subprocess.CalledProcessError as e:
        print(f"Git pull failed: {e}", file=sys.stderr)
        # continue — repo may be fine even if pull failed

generated_data = ""
output_path = Path("generated_data.py")

# Path to sound definitions
sound_file = repo_dir / "resource_pack" / "sounds" / "sound_definitions.json"

if not sound_file.exists():
    print(f"Sound definitions file not found: {sound_file}", file=sys.stderr)
    sys.exit(1)

try:
    sounds_data = json.loads(sound_file.read_text(encoding="utf-8"))["sound_definitions"]
except json.JSONDecodeError as e:
    print(f"Failed to parse JSON from {sound_file}: {e}", file=sys.stderr)
    sys.exit(1)

# Iterate over top level keys and collect all sound paths to a set
all_sounds = set()
if isinstance(sounds_data, dict):
    for key, value in sounds_data.items():
        if not isinstance(value, dict):
            continue
        sounds = value.get("sounds")
        if not sounds:
            continue
        for sound in sounds:
            if isinstance(sound, dict):
                name = sound.get("name")
                if name:
                    all_sounds.add(name)
            elif isinstance(sound, str):
                all_sounds.add(sound)
else:
    print(f"Unexpected JSON structure in {sound_file}: expected an object at top level", file=sys.stderr)

print(f"Collected {len(all_sounds)} sounds from {sound_file}")

generated_data += "vanilla_sounds = ["
for sound in sorted(all_sounds):
    generated_data += "\n\"" + sound + "\","
generated_data += "\n]"

output_path.write_text(generated_data, encoding="utf-8")