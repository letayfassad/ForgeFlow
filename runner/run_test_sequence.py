"""Verification entry: launches `python main.py` and runs unpatched WS client roundtrips."""

from __future__ import annotations

import asyncio
import json
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

import websockets

RUNNER_DIR = Path(__file__).parent
SHARED_DIR = RUNNER_DIR.parent / "shared"
TEST_SEQUENCE = json.loads((SHARED_DIR / "verification-sequence.json").read_text(encoding="utf-8"))


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _launch_main_py(port: int) -> tuple[subprocess.Popen[str], list[str]]:
    cmd = [sys.executable, "main.py", "--host", "127.0.0.1", "--port", str(port)]
    print(f"Launching: {' '.join(cmd)}")
    proc = subprocess.Popen(
        cmd,
        cwd=RUNNER_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    lines: list[str] = []

    def _reader() -> None:
        assert proc.stdout is not None
        for line in proc.stdout:
            lines.append(line)
            sys.stdout.write(f"[main.py] {line}")

    thread = threading.Thread(target=_reader, daemon=True)
    thread.start()
    return proc, lines


async def _wait_for_server(port: int, timeout: float = 15.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            async with websockets.connect(f"ws://127.0.0.1:{port}", open_timeout=1):
                return True
        except Exception:
            await asyncio.sleep(0.1)
    return False


async def _run_client_roundtrip(run_number: int, port: int) -> dict:
    messages: list[dict] = []
    async with websockets.connect(f"ws://127.0.0.1:{port}") as ws:
        await ws.recv()
        await ws.send(json.dumps({"type": "ping"}))
        pong = json.loads(await ws.recv())
        messages.append(pong)

        await ws.send(json.dumps({"type": "execute", "sequence": TEST_SEQUENCE}))
        while True:
            msg = json.loads(await ws.recv())
            messages.append(msg)
            if msg["type"] == "complete":
                break

    complete = next(m for m in messages if m["type"] == "complete")
    progress = [m for m in messages if m["type"] == "progress"]
    return {
        "run": run_number,
        "entry_point": "python main.py",
        "sequence_file": str(SHARED_DIR / "verification-sequence.json"),
        "ping": pong["type"],
        "success": complete["success"],
        "progress_steps": len(progress),
        "error": complete.get("error"),
        "message_types": [m["type"] for m in messages],
    }


async def main_async() -> int:
    port = _free_port()
    print("ForgeFlow runner verification via python main.py (unpatched)")
    print(f"Sequence: {json.dumps(TEST_SEQUENCE, indent=2)}")

    proc, server_lines = _launch_main_py(port)

    try:
        if not await _wait_for_server(port):
            print("ERROR: main.py did not become reachable in time")
            return 1

        results = []
        for i in range(2):
            result = await _run_client_roundtrip(i + 1, port)
            results.append(result)
            print(f"\n--- Run {i + 1} ---")
            print(json.dumps(result, indent=2))

        all_ok = all(r["success"] for r in results)
        print(f"\nAll runs successful: {all_ok}")

        print("\n=== main.py stdout (library invocation evidence) ===")
        for line in server_lines:
            if "forgeflow.execute" in line or "pyautogui active" in line:
                print(line.rstrip())

        required_libs = ("pynput", "pyautogui", "keyboard", "mouse", "subprocess")
        required_types = (
            "move_mouse", "wait", "type_text", "click", "double_click", "right_click",
            "press_key", "hotkey", "scroll", "open_application",
        )
        log_text = "".join(server_lines)
        for lib in required_libs:
            if f"library={lib}" not in log_text:
                print(f"ERROR: missing library={lib} in executor logs")
                return 1
        for action_type in required_types:
            if f"type={action_type}" not in log_text:
                print(f"ERROR: missing type={action_type} in executor logs")
                return 1
        if "'seconds': 0.05" not in log_text:
            print("ERROR: wait seconds=0.05 not honored in logs")
            return 1
        if "'x': 500" not in log_text:
            print("ERROR: move_mouse x=500 not honored in logs")
            return 1

        return 0 if all_ok else 1
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


def main() -> int:
    return asyncio.run(main_async())


if __name__ == "__main__":
    sys.exit(main())