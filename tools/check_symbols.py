#!/usr/bin/env python3
"""Check that every literal native symbol reference has a bundled PNG."""
from pathlib import Path
import re
import sys

source = Path("app/src/io/freemytv")
assets = Path("app/assets/symbols")
pattern = re.compile(r'Symbols\.(?:draw|warm)\(getContext\(\),\s*"([^"]+)"')
used = set()

if not source.is_dir():
    print(f"Native source directory not found: {source}", file=sys.stderr)
    sys.exit(2)

for path in source.glob("*.java"):
    used.update(pattern.findall(path.read_text(encoding="utf-8")))

missing = sorted(name for name in used if not (assets / f"{name}.png").is_file())
if missing:
    print("Missing bundled symbol PNGs: " + ", ".join(missing), file=sys.stderr)
    sys.exit(1)

print(f"Native symbol assets verified: {len(used)}")
