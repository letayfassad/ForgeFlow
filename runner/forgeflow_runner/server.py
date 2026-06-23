"""WebSocket server for ForgeFlow runner."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import websockets
from websockets.server import WebSocketServerProtocol

from .executor import ActionExecutor
from .schema import validate_sequence

logger = logging.getLogger(__name__)

DEFAULT_HOST = "localhost"
DEFAULT_PORT = 8765


class RunnerServer:
    def __init__(self, host: str = DEFAULT_HOST, port: int = DEFAULT_PORT):
        self.host = host
        self.port = port
        self._executor = ActionExecutor()
        self._clients: set[WebSocketServerProtocol] = set()

    async def _send(self, ws: WebSocketServerProtocol, message: dict[str, Any]) -> None:
        await ws.send(json.dumps(message))

    async def _broadcast(self, message: dict[str, Any]) -> None:
        if self._clients:
            await asyncio.gather(
                *[self._send(client, message) for client in self._clients],
                return_exceptions=True,
            )

    def _on_progress(self, step: int, total: int, action: str) -> None:
        asyncio.create_task(
            self._broadcast(
                {
                    "type": "progress",
                    "step": step,
                    "total": total,
                    "action": action,
                }
            )
        )

    async def _handle_execute(self, ws: WebSocketServerProtocol, data: dict[str, Any]) -> None:
        sequence_data = data.get("sequence")
        if not sequence_data:
            await self._send(ws, {"type": "error", "message": "Missing sequence"})
            return

        try:
            sequence = validate_sequence(sequence_data)
        except Exception as exc:
            await self._send(ws, {"type": "error", "message": str(exc)})
            return

        await self._broadcast(
            {
                "type": "status",
                "status": {
                    "connected": True,
                    "executing": True,
                    "currentStep": 0,
                    "totalSteps": len(sequence.actions),
                },
            }
        )

        executor = ActionExecutor(on_progress=self._on_progress)
        self._executor = executor

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, executor.execute, sequence)

        await self._broadcast(
            {
                "type": "complete",
                "success": result.success,
                "error": result.error,
            }
        )
        await self._broadcast(
            {
                "type": "status",
                "status": {"connected": True, "executing": False},
            }
        )

    async def handler(self, ws: WebSocketServerProtocol) -> None:
        self._clients.add(ws)
        logger.info("Client connected: %s", ws.remote_address)

        await self._send(
            ws,
            {
                "type": "status",
                "status": {"connected": True, "executing": False},
            },
        )

        try:
            async for raw in ws:
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    await self._send(ws, {"type": "error", "message": "Invalid JSON"})
                    continue

                msg_type = data.get("type")

                if msg_type == "ping":
                    await self._send(ws, {"type": "pong"})
                elif msg_type == "execute":
                    asyncio.create_task(self._handle_execute(ws, data))
                elif msg_type == "stop":
                    self._executor.request_stop()
                    await self._broadcast(
                        {
                            "type": "status",
                            "status": {"connected": True, "executing": False, "message": "Stopping..."},
                        }
                    )
                else:
                    await self._send(ws, {"type": "error", "message": f"Unknown type: {msg_type}"})
        finally:
            self._clients.discard(ws)
            logger.info("Client disconnected: %s", ws.remote_address)

    async def start(self) -> None:
        logger.info("Starting ForgeFlow runner on ws://%s:%s", self.host, self.port)
        async with websockets.serve(self.handler, self.host, self.port):
            await asyncio.Future()