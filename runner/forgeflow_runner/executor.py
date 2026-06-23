"""Desktop action executor using pyautogui and related libraries."""

from __future__ import annotations

import logging
import os
import subprocess
import time
from dataclasses import dataclass, field
from typing import Callable

import pyautogui

from .schema import (
    ActionSequence,
    ClickAction,
    DoubleClickAction,
    ForgeAction,
    HotkeyAction,
    MoveMouseAction,
    OpenApplicationAction,
    PressKeyAction,
    RightClickAction,
    ScrollAction,
    TypeTextAction,
    WaitAction,
    validate_sequence,
)

logger = logging.getLogger(__name__)

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.05


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
        self._pyautogui = pyautogui

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
                self._execute_action(action)
            except Exception as exc:
                logger.exception("Action failed: %s", action.type)
                return ExecutionResult(
                    success=False,
                    steps_completed=i,
                    total_steps=total,
                    error=str(exc),
                    timing_log=timing_log,
                )
            elapsed = time.perf_counter() - start
            timing_log.append({"step": i + 1, "type": action.type, "elapsed": elapsed})

        return ExecutionResult(
            success=True,
            steps_completed=total,
            total_steps=total,
            timing_log=timing_log,
        )

    def _execute_action(self, action: ForgeAction) -> None:
        if self._dry_run:
            logger.info("[DRY RUN] %s", action.type)
            time.sleep(0.01)
            return

        if isinstance(action, MoveMouseAction):
            self._pyautogui.moveTo(action.x, action.y, duration=action.duration)
        elif isinstance(action, ClickAction):
            if action.x is not None and action.y is not None:
                self._pyautogui.click(action.x, action.y, button=action.button)
            else:
                self._pyautogui.click(button=action.button)
        elif isinstance(action, DoubleClickAction):
            if action.x is not None and action.y is not None:
                self._pyautogui.doubleClick(action.x, action.y)
            else:
                self._pyautogui.doubleClick()
        elif isinstance(action, RightClickAction):
            if action.x is not None and action.y is not None:
                self._pyautogui.rightClick(action.x, action.y)
            else:
                self._pyautogui.rightClick()
        elif isinstance(action, TypeTextAction):
            self._pyautogui.write(action.text, interval=action.interval)
        elif isinstance(action, PressKeyAction):
            self._pyautogui.press(action.key)
        elif isinstance(action, HotkeyAction):
            self._pyautogui.hotkey(*action.keys)
        elif isinstance(action, WaitAction):
            time.sleep(action.seconds)
        elif isinstance(action, OpenApplicationAction):
            self._open_application(action.target)
        elif isinstance(action, ScrollAction):
            if action.x is not None and action.y is not None:
                self._pyautogui.scroll(action.amount, x=action.x, y=action.y)
            else:
                self._pyautogui.scroll(action.amount)

    def _open_application(self, target: str) -> None:
        target_lower = target.lower()
        app_map = {
            "notepad": "notepad.exe",
            "calculator": "calc.exe",
            "calc": "calc.exe",
            "explorer": "explorer.exe",
            "cmd": "cmd.exe",
            "paint": "mspaint.exe",
        }
        executable = app_map.get(target_lower, target)
        if os.path.isfile(executable) or executable.endswith(".exe"):
            subprocess.Popen([executable], shell=True)
        else:
            os.startfile(executable)  # type: ignore[attr-defined]