"""Non-interactive runner test — executes a safe dry-run sequence twice."""

import json
import sys

from forgeflow_runner.executor import ActionExecutor
from forgeflow_runner.schema import validate_sequence

TEST_SEQUENCE = {
    "version": "1.0",
    "name": "Verification Run",
    "actions": [
        {"type": "move_mouse", "x": 10, "y": 10, "duration": 0.05},
        {"type": "wait", "seconds": 0.05},
        {"type": "type_text", "text": "x", "interval": 0.01},
        {"type": "click"},
    ],
}


def run_once(run_number: int, dry_run: bool = True) -> dict:
    sequence = validate_sequence(TEST_SEQUENCE)
    executor = ActionExecutor(dry_run=dry_run)
    result = executor.execute(sequence)
    return {
        "run": run_number,
        "success": result.success,
        "steps": result.steps_completed,
        "total": result.total_steps,
        "timing_log": result.timing_log,
        "error": result.error,
    }


def main() -> int:
    dry_run = "--live" not in sys.argv
    mode = "dry_run" if dry_run else "live"
    print(f"ForgeFlow runner verification ({mode})")
    results = [run_once(i + 1, dry_run=dry_run) for i in range(2)]
    print(json.dumps(results, indent=2))
    all_ok = all(r["success"] for r in results)
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())