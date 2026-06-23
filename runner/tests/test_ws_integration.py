"""WebSocket server integration tests — exercises RunnerServer entry path."""

from __future__ import annotations

import asyncio
import json
import unittest
from unittest.mock import MagicMock, patch

import websockets

from forgeflow_runner.server import RunnerServer

TEST_SEQUENCE = {
    "version": "1.0",
    "name": "WS Integration",
    "actions": [
        {"type": "move_mouse", "x": 10, "y": 20, "duration": 0.05},
        {"type": "wait", "seconds": 0.05},
        {"type": "type_text", "text": "x", "interval": 0.01},
        {"type": "click", "x": 10, "y": 20},
    ],
}

TEST_PORT = 18765


class TestWebSocketIntegration(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.hotkey_patcher = patch("forgeflow_runner.server.keyboard.add_hotkey")
        self.hotkey_patcher.start()
        self.server = RunnerServer(host="localhost", port=TEST_PORT)
        self.ready = asyncio.Event()
        self.server_task = asyncio.create_task(
            self.server.start_for_test(ready_event=self.ready)
        )
        await asyncio.wait_for(self.ready.wait(), timeout=5.0)

    async def asyncTearDown(self) -> None:
        self.server_task.cancel()
        try:
            await self.server_task
        except asyncio.CancelledError:
            pass
        self.hotkey_patcher.stop()

    @patch("forgeflow_runner.executor.pyautogui")
    @patch("forgeflow_runner.executor.keyboard")
    @patch("forgeflow_runner.executor.mouse")
    @patch("forgeflow_runner.executor._mouse_controller")
    @patch("forgeflow_runner.executor._keyboard_controller")
    async def test_ws_execute_roundtrip(
        self,
        mock_kb_ctrl,
        mock_mouse_ctrl,
        mock_mouse_lib,
        mock_keyboard_lib,
        mock_pyautogui,
    ):
        mock_mouse_ctrl.position = (0, 0)
        mock_pyautogui.position.return_value = (0, 0)
        messages: list[dict] = []

        async with websockets.connect(f"ws://localhost:{TEST_PORT}") as ws:
            initial = json.loads(await asyncio.wait_for(ws.recv(), timeout=3))
            self.assertEqual(initial["type"], "status")

            await ws.send(json.dumps({"type": "ping"}))
            pong = json.loads(await asyncio.wait_for(ws.recv(), timeout=3))
            self.assertEqual(pong["type"], "pong")

            await ws.send(json.dumps({"type": "execute", "sequence": TEST_SEQUENCE}))

            while True:
                raw = await asyncio.wait_for(ws.recv(), timeout=10)
                msg = json.loads(raw)
                messages.append(msg)
                if msg["type"] == "complete":
                    break

        types = [m["type"] for m in messages]
        self.assertIn("progress", types)
        complete = next(m for m in messages if m["type"] == "complete")
        self.assertTrue(complete["success"])

        mock_mouse_ctrl.position  # pynput used for move
        mock_kb_ctrl.type.assert_called()
        mock_pyautogui.click.assert_called_once_with(10, 20, button="left")

    @patch("forgeflow_runner.executor.pyautogui")
    @patch("forgeflow_runner.executor.keyboard")
    @patch("forgeflow_runner.executor.mouse")
    @patch("forgeflow_runner.executor._mouse_controller")
    @patch("forgeflow_runner.executor._keyboard_controller")
    async def test_ws_execute_consistent_twice(
        self,
        mock_kb_ctrl,
        mock_mouse_ctrl,
        mock_mouse_lib,
        mock_keyboard_lib,
        mock_pyautogui,
    ):
        mock_mouse_ctrl.position = (0, 0)
        mock_pyautogui.position.return_value = (0, 0)

        for run in range(2):
            async with websockets.connect(f"ws://localhost:{TEST_PORT}") as ws:
                await ws.recv()  # status
                await ws.send(json.dumps({"type": "execute", "sequence": TEST_SEQUENCE}))
                while True:
                    msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=10))
                    if msg["type"] == "complete":
                        self.assertTrue(msg["success"], f"Run {run + 1} failed")
                        break


if __name__ == "__main__":
    unittest.main()