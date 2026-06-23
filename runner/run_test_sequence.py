"""Verification entry: launches real RunnerServer WS entry and runs client roundtrip twice."""

from __future__ import annotations

import asyncio
import json
import sys
from unittest.mock import MagicMock, patch

import websockets

from forgeflow_runner.server import RunnerServer

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


def _free_port() -> int:
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


async def run_client_roundtrip(run_number: int, port: int) -> dict:
    messages: list[dict] = []
    async with websockets.connect(f"ws://127.0.0.1:{port}") as ws:
        await ws.recv()  # initial status
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
        "entry_point": "RunnerServer (main.py module path)",
        "ping": pong["type"],
        "success": complete["success"],
        "progress_steps": len(progress),
        "error": complete.get("error"),
        "message_types": [m["type"] for m in messages],
    }


async def main_async() -> int:
    print("ForgeFlow runner verification via WebSocket server entry point")
    print(f"Sequence: {json.dumps(TEST_SEQUENCE, indent=2)}")

    port = _free_port()
    server = RunnerServer(host="127.0.0.1", port=port)
    ready = asyncio.Event()

    with (
        patch("forgeflow_runner.server.keyboard.add_hotkey"),
        patch("forgeflow_runner.executor.pyautogui"),
        patch("forgeflow_runner.executor.keyboard"),
        patch("forgeflow_runner.executor.mouse"),
        patch("forgeflow_runner.executor._mouse_controller") as mock_mouse,
        patch("forgeflow_runner.executor._keyboard_controller") as mock_kb,
    ):
        mock_mouse.position = (0, 0)
        mock_kb.type = MagicMock()

        server_task = asyncio.create_task(server.start_for_test(ready_event=ready))
        await asyncio.wait_for(ready.wait(), timeout=5)
        print(f"RunnerServer listening on ws://127.0.0.1:{port}")

        results = []
        for i in range(2):
            result = await run_client_roundtrip(i + 1, port)
            results.append(result)
            print(f"\n--- Run {i + 1} ---")
            print(json.dumps(result, indent=2))

        server_task.cancel()
        try:
            await server_task
        except asyncio.CancelledError:
            pass

    all_ok = all(r["success"] for r in results)
    print(f"\nAll runs successful: {all_ok}")
    return 0 if all_ok else 1


def main() -> int:
    return asyncio.run(main_async())


if __name__ == "__main__":
    sys.exit(main())