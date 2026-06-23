"""Execution context passed to action handlers."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable

from pynput.keyboard import Controller as KeyboardController
from pynput.mouse import Controller as MouseController

logger = logging.getLogger(__name__)


@dataclass
class HandlerContext:
    dry_run: bool
    stop_requested: Callable[[], bool]
    pyautogui: object
    mouse_ctrl: MouseController
    keyboard_ctrl: KeyboardController

    def log_action(self, action_type: str, library: str, **params: object) -> None:
        logger.info(
            "forgeflow.execute type=%s library=%s params=%s",
            action_type,
            library,
            params,
        )

    def interruptible_sleep(self, seconds: float) -> None:
        chunk = 0.05
        remaining = seconds
        while remaining > 0:
            if self.stop_requested():
                return
            time.sleep(min(chunk, remaining))
            remaining -= chunk