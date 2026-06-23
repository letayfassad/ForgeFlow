"""open_application handler — resolve target and launch without shell=True."""

from __future__ import annotations

import os
import subprocess

from ..schema import OpenApplicationAction
from .context import HandlerContext

DETACHED_PROCESS = 0x00000008

APP_MAP: dict[str, str] = {
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "explorer": "explorer.exe",
    "cmd": "cmd.exe",
    "paint": "mspaint.exe",
}


def resolve_executable(target: str) -> str:
    return APP_MAP.get(target.lower(), target)


def launch(executable: str) -> None:
    """Launch an executable. Uses Popen list form (no shell=True) on Windows."""
    if os.path.isfile(executable) or executable.lower().endswith(".exe"):
        subprocess.Popen([executable], creationflags=DETACHED_PROCESS)
    else:
        os.startfile(executable)  # type: ignore[attr-defined]


def handle(action: OpenApplicationAction, ctx: HandlerContext) -> str:
    library = "subprocess"
    executable = resolve_executable(action.target)
    ctx.log_action(action.type, library, target=action.target, executable=executable)
    if not ctx.dry_run:
        launch(executable)
    return library