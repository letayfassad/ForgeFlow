"""Action handler registry — one dispatch path per v1 action type."""

from __future__ import annotations

from typing import Callable

from ..schema import (
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
)
from .context import HandlerContext
from . import keys, mouse, open_app, scroll, wait

HandlerFn = Callable[[ForgeAction, HandlerContext], str]


def _wrap(fn: Callable) -> HandlerFn:
    def dispatcher(action: ForgeAction, ctx: HandlerContext) -> str:
        return fn(action, ctx)  # type: ignore[arg-type, call-arg]

    return dispatcher


HANDLERS: dict[str, HandlerFn] = {
    "move_mouse": _wrap(mouse.handle_move),
    "click": _wrap(mouse.handle_click),
    "double_click": _wrap(mouse.handle_double_click),
    "right_click": _wrap(mouse.handle_right_click),
    "type_text": _wrap(keys.handle_type_text),
    "press_key": _wrap(keys.handle_press_key),
    "hotkey": _wrap(keys.handle_hotkey),
    "wait": _wrap(wait.handle),
    "open_application": _wrap(open_app.handle),
    "scroll": _wrap(scroll.handle),
}


def library_for(action: ForgeAction) -> str:
    if isinstance(action, MoveMouseAction):
        return "pynput"
    if isinstance(action, TypeTextAction):
        return "pynput"
    if isinstance(action, (PressKeyAction, HotkeyAction)):
        return "keyboard"
    if isinstance(action, ScrollAction):
        return "mouse"
    if isinstance(action, OpenApplicationAction):
        return "subprocess"
    if isinstance(action, ClickAction):
        return "pyautogui" if action.x is not None else "mouse"
    if isinstance(action, DoubleClickAction):
        return "pyautogui" if action.x is not None else "mouse"
    if isinstance(action, RightClickAction):
        return "pyautogui" if action.x is not None else "mouse"
    if isinstance(action, WaitAction):
        return "stdlib"
    return "unknown"


def execute_action(action: ForgeAction, ctx: HandlerContext) -> str:
    handler = HANDLERS.get(action.type)
    if handler is None:
        raise ValueError(f"Unknown action type: {action.type}")
    if ctx.dry_run:
        library = library_for(action)
        ctx.log_action(action.type, library, dry_run=True)
        import time

        time.sleep(0.01)
        return library
    return handler(action, ctx)