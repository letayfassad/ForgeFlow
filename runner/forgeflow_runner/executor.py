"""Desktop action executor — dispatches to handler registry."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Callable

import pyautogui
from pynput.keyboard import Controller as KeyboardController
from pynput.mouse import Controller as MouseController

from .handlers import HandlerContext, execute_action, library_for
from .schema import ActionSequence, ForgeAction, validate_sequence

logger = logging.getLogger(__name__)

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.05

_mouse_controller = MouseController()
_keyboard_controller = KeyboardController()


@dataclass
class ExecutionResult:
    success: bool
    steps_completed: int = 0
    total_steps: int = 0
    error: str | None = None
    stopped: bool = False
    timing_log: list[dict] = field(default_factory=list)


class ActionExecutor:
    """Executes ForgeFlow action sequences on the real desktop."""

    def __init__(
        self,
        on_progress: Callable[[int, int, str], None] | None = None,
        dry_run: bool = False,
    ):
        self._stop_requested = False
        self._on_progress = on_progress
        self._dry_run = dry_run
        self._ctx = HandlerContext(
            dry_run=dry_run,
            stop_requested=lambda: self._stop_requested,
            pyautogui=pyautogui,
            mouse_ctrl=_mouse_controller,
            keyboard_ctrl=_keyboard_controller,
        )

    def request_stop(self) -> None:
        self._stop_requested = True

    def reset_stop(self) -> None:
        self._stop_requested = False

    def execute(self, sequence: ActionSequence | dict) -> ExecutionResult:
        if isinstance(sequence, dict):
            sequence = validate_sequence(sequence)

        self.reset_stop()
        total = len(sequence.actions)
        timing_log: list[dict] = []

        if not self._dry_run:
            pos = pyautogui.position()
            logger.info("pyautogui active, cursor at %s, FAILSAFE=%s", pos, pyautogui.FAILSAFE)

        for i, action in enumerate(sequence.actions):
            if self._stop_requested:
                return ExecutionResult(
                    success=False,
                    steps_completed=i,
                    total_steps=total,
                    stopped=True,
                    error="Stopped by user",
                    timing_log=timing_log,
                )

            label = action.label or action.type
            if self._on_progress:
                self._on_progress(i + 1, total, label)

            start = time.perf_counter()
            try:
                used_library = execute_action(action, self._ctx)
            except Exception as exc:
                logger.exception("Action failed: %s", action.type)
                return ExecutionResult(
                    success=False,
                    steps_completed=i,
                    total_steps=total,
                    error=str(exc),
                    timing_log=timing_log,
                )

            if self._stop_requested:
                return ExecutionResult(
                    success=False,
                    steps_completed=i + 1,
                    total_steps=total,
                    stopped=True,
                    error="Stopped by user",
                    timing_log=timing_log,
                )

            elapsed = time.perf_counter() - start
            timing_log.append({
                "step": i + 1,
                "type": action.type,
                "elapsed": elapsed,
                "library": used_library or library_for(action),
            })

        return ExecutionResult(
            success=True,
            steps_completed=total,
            total_steps=total,
            timing_log=timing_log,
        )

    @staticmethod
    def _library_for(action: ForgeAction) -> str:
        return library_for(action)