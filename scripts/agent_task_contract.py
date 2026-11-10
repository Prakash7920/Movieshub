#!/usr/bin/env python3
"""Validate a manually submitted NexaFilm agent task and emit an audit contract.

This foundation stage deliberately does not call an AI provider or modify source files.
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import PurePosixPath

TASK_ID = re.compile(r"^[A-Z0-9][A-Z0-9._-]{2,63}$")
MAX_OBJECTIVE = 1200
MAX_PATHS = 20
PROTECTED_PREFIXES = (
    ".github/",
    ".git/",
    "prisma/migrations/",
    "node_modules/",
    ".next/",
)
PROTECTED_FILES = {
    ".env", ".env.local", ".env.production", ".env.development",
    "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
    "vercel.json",
}


def fail(message: str) -> None:
    print(f"AGENT_TASK_CONTRACT: FAIL — {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    task_id = os.environ.get("TASK_ID", "").strip()
    objective = os.environ.get("OBJECTIVE", "").strip()
    raw_paths = os.environ.get("ALLOWED_PATHS", "")

    if not TASK_ID.fullmatch(task_id):
        fail("task_id must be 3–64 characters using A-Z, 0-9, dot, underscore or hyphen")
    if not objective or len(objective) > MAX_OBJECTIVE:
        fail(f"objective must contain 1–{MAX_OBJECTIVE} characters")

    paths = [line.strip() for line in raw_paths.splitlines() if line.strip()]
    if not paths:
        fail("at least one explicit allowed path is required")
    if len(paths) > MAX_PATHS:
        fail(f"no more than {MAX_PATHS} paths may be allowed")

    normalized: list[str] = []
    for raw in paths:
        if "\\" in raw or ":" in raw:
            fail(f"unsupported path syntax: {raw}")
        path = PurePosixPath(raw)
        if path.is_absolute() or ".." in path.parts or str(path) in ("", "."):
            fail(f"unsafe path: {raw}")
        value = path.as_posix()
        parts = path.parts
        protected = value in PROTECTED_FILES or any(
            parts[: len(PurePosixPath(prefix).parts)] == PurePosixPath(prefix).parts
            for prefix in PROTECTED_PREFIXES
        )
        if protected:
            fail(f"path is protected from agent writes: {value}")
        if value.startswith(".env") or "/.env" in value:
            fail(f"environment files are never allowed: {value}")
        if value not in normalized:
            normalized.append(value)

    contract = {
        "schema_version": "1.0",
        "task_id": task_id,
        "objective": objective,
        "allowed_paths": normalized,
        "repository": "Prakash7920/movieshub",
        "required_base_branch": "feature/nexafilm-agent-foundation",
        "execution_mode": "contract-validation-only",
        "model_invocation": False,
        "source_file_writes": False,
        "production_access": False,
        "database_access": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "acceptance_gates": [
            "task scope is explicit",
            "all requested paths are within the allowlist",
            "QA evidence is attached before PASS",
            "Security Auditor review is attached before PASS",
            "Database Auditor remains read-only",
            "human approval is required before accepting changes",
        ],
    }

    os.makedirs("agent-evidence", exist_ok=True)
    with open("agent-evidence/task-contract.json", "w", encoding="utf-8") as handle:
        json.dump(contract, handle, indent=2)
        handle.write("\n")

    report = {
        "task_id": task_id,
        "status": "PASS",
        "stage": "contract-validation",
        "checks": {
            "task_id_valid": True,
            "objective_valid": True,
            "allowlist_nonempty": True,
            "paths_safe": True,
            "protected_paths_excluded": True,
            "model_invoked": False,
            "source_files_modified": False,
            "production_accessed": False,
            "database_accessed": False,
        },
        "allowed_path_count": len(normalized),
        "next_gate": "Configure and review a dedicated model-provider adapter before enabling AI execution.",
    }
    with open("agent-evidence/checkpoint-report.json", "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")

    print("AGENT_TASK_CONTRACT: PASS")
    print(f"TASK_ID: {task_id}")
    print(f"ALLOWED_PATHS: {len(normalized)}")
    print("MODEL_INVOCATION: DISABLED")
    print("SOURCE_FILE_WRITES: DISABLED")
    print("PRODUCTION_ACCESS: DISABLED")
    print("DATABASE_ACCESS: DISABLED")


if __name__ == "__main__":
    main()
