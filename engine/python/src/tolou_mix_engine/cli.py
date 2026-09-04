from __future__ import annotations

import json
import sys

from tolou_mix_engine.durability import evaluate_durability
from tolou_mix_engine.integrated_design import calculate_integrated_normal_mix


def read_payload() -> dict:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"status": "fail", "error": "missing command"}, ensure_ascii=False))
        return 2

    command = sys.argv[1]
    payload = read_payload()

    if command == "health":
        response = {
            "status": "pass",
            "engine": "tolou-mix-engine",
            "version": "0.3.0",
            "message": "Python engineering engine is ready.",
        }
    elif command == "calculate-normal-mix":
        response = calculate_integrated_normal_mix(payload)
    elif command == "evaluate-durability":
        response = evaluate_durability(payload)
    else:
        response = {"status": "fail", "error": f"unknown command: {command}"}

    print(json.dumps(response, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
