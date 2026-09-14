#!/usr/bin/env python3
"""Validate the source/package contract without requiring Maven dependencies."""

from __future__ import annotations

import re
import sys
from pathlib import Path


JAVA_ROOTS = (Path("src/main/java"), Path("src/test/java"))
PROJECT_PACKAGE = "com.southrail.reservation"
PACKAGE_PATTERN = re.compile(r"^package\s+([\w.]+);", re.MULTILINE)
IMPORT_PATTERN = re.compile(
    rf"^import\s+({re.escape(PROJECT_PACKAGE)}\.[\w.]+);", re.MULTILINE
)


def java_sources() -> list[Path]:
    return sorted(path for root in JAVA_ROOTS for path in root.rglob("*.java"))


def main() -> int:
    errors: list[str] = []
    sources = java_sources()
    declared_types: set[str] = set()

    for source in sources:
        contents = source.read_text(encoding="utf-8")
        package_match = PACKAGE_PATTERN.search(contents)
        if package_match is None:
            errors.append(f"{source}: missing package declaration")
            continue

        package_name = package_match.group(1)
        source_root = next(root for root in JAVA_ROOTS if source.is_relative_to(root))
        expected_directory = source_root.joinpath(*package_name.split("."))
        if source.parent != expected_directory:
            errors.append(
                f"{source}: package {package_name} belongs under {expected_directory}"
            )

        declared_types.add(f"{package_name}.{source.stem}")

    for source in sources:
        contents = source.read_text(encoding="utf-8")
        for imported_type in IMPORT_PATTERN.findall(contents):
            if imported_type not in declared_types:
                errors.append(f"{source}: unresolved project import {imported_type}")

    if errors:
        print("Package architecture validation failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print(f"Validated package architecture for {len(sources)} Java source files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
