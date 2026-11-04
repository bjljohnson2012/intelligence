#!/usr/bin/env python3
"""Replace the intelligence.benjohnson.ai site block inside the live Caddyfile."""

import argparse
import shutil
import sys
import time
from pathlib import Path


def find_block(text, site):
    start = 0
    while True:
        i = text.find(site, start)
        if i < 0:
            return None
        if i > 0 and text[i - 1] not in "\n":
            start = i + 1
            continue
        brace = text.find("{", i)
        if brace < 0:
            return None
        if text[i + len(site):brace].strip() != "":
            start = i + 1
            continue
        depth = 0
        for j in range(brace, len(text)):
            if text[j] == "{":
                depth += 1
            elif text[j] == "}":
                depth -= 1
                if depth == 0:
                    end = j + 1
                    if end < len(text) and text[end] == "\n":
                        end += 1
                    return i, end
        raise SystemExit("Caddyfile site block has unbalanced braces")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("caddyfile")
    parser.add_argument("blockfile")
    parser.add_argument("--site", default="intelligence.benjohnson.ai")
    args = parser.parse_args()
    path = Path(args.caddyfile)
    if not path.is_file():
        raise SystemExit(f"Missing {path}")
    block = Path(args.blockfile).read_text().strip() + "\n"
    text = path.read_text()
    found = find_block(text, args.site)
    if found:
        start, end = found
        updated = text[:start] + block + text[end:]
    else:
        updated = text.rstrip() + "\n\n" + block
    backup = path.with_name(path.name + ".bak-intel-" + time.strftime("%Y%m%d%H%M%S"))
    shutil.copy2(path, backup)
    path.write_text(updated)
    print(f"Backed up to {backup}", file=sys.stderr)
    print(f"Updated {path}")


if __name__ == "__main__":
    main()
