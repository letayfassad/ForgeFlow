"""Desktop action executor using pyautogui, pynput, keyboard, and mouse."""

from __future__ import annotations

import logging
import os
import subprocess
import time
from dataclasses import dataclass, field
from typing import Callable

import keyboard
import mouse
import pyautogui
from pynput.keyboard import Controller as KeyboardController
from pynput.mouse import Controller as MouseController

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
        self._pyautogui = pyautogui
        self._mouse = _mouse_controller
        self._keyboard = _keyboard_controller

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
            timing_log.append({
                "step": i + 1,
                "type": action.type,
                "elapsed": elapsed,
                "library": self._library_for(action),
            })

        return ExecutionResult(
            success=True,
            steps_completed=total,
            total_steps=total,
            timing_log=timing_log,
        )

    @staticmethod
    def _library_for(action: ForgeAction) -> str:
        if isinstance(action, MoveMouseAction):
            return "pynput"
        if isinstance(action, TypeTextAction):
            return "pynput"
        if isinstance(action, (PressKeyAction, HotkeyAction)):
            return "keyboard"
        if isinstance(action, ScrollAction):
            return "mouse"
        if isinstance(action, (ClickAction, DoubleClickAction, RightClickAction)):
            return "pyautogui"
        return "stdlib"

    def _execute_action(self, action: ForgeAction) -> None:
        if self._dry_run:
            logger.info("[DRY RUN] %s via %s", action.type, self._library_for(action))
            time.sleep(0.01)
            return

        if isinstance(action, MoveMouseAction):
            self._move_mouse(action.x, action.y, action.duration)
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
            self._type_text(action.text, action.interval)
        elif isinstance(action, PressKeyAction):
            keyboard.press_and_release(action.key)
        elif isinstance(action, HotkeyAction):
            keyboard.send("+".join(action.keys))
        elif isinstance(action, WaitAction):
            time.sleep(action.seconds)
        elif isinstance(action, OpenApplicationAction):
            self._open_application(action.target)
        elif isinstance(action, ScrollAction):
            mouse.wheel(action.amount)

    def _move_mouse(self, x: float, y: float, duration: float) -> None:
        """Smooth visible mouse movement via pynput over the requested duration."""
        start_x, start_y = self._mouse.position
        steps = max(int(duration / 0.02), 1)
        step_delay = duration / steps
        for i in range(1, steps + 1):
            if self._stop_requested:
                return
            t = i / steps
            nx = int(start_x + (x - start_x) * t)
            ny = int(start_y + (y - start_y) * t)
            self._mouse.position = (nx, ny)
            time.sleep(step_delay)

    def _type_text(self, text: str, interval: float) -> None:
        """Type text character-by-character via pynput with per-char interval."""
        for char in text:
            if self._stop_requested:
                return
            self._keyboard.type(char)
            time.sleep(interval)

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