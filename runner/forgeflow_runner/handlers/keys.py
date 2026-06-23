"""Keyboard and typing handlers (pynput + keyboard)."""

from __future__ import annotations

import time

import keyboard

from ..schema import HotkeyAction, PressKeyAction, TypeTextAction
from .context import HandlerContext


def handle_type_text(action: TypeTextAction, ctx: HandlerContext) -> str:
    library = "pynput"
    ctx.log_action(action.type, library, text=action.text, interval=action.interval)
    if not ctx.dry_run:
        for char in action.text:
            if ctx.stop_requested():
                return library
            ctx.keyboard_ctrl.type(char)
            time.sleep(action.interval)
    return library


def handle_press_key(action: PressKeyAction, ctx: HandlerContext) -> str:
    library = "keyboard"
    ctx.log_action(action.type, library, key=action.key)
    if not ctx.dry_run:
        keyboard.press_and_release(action.key)
    return library


def handle_hotkey(action: HotkeyAction, ctx: HandlerContext) -> str:
    library = "keyboard"
    combo = "+".join(action.keys)
    ctx.log_action(action.type, library, keys=combo)
    if not ctx.dry_run:
        keyboard.send(combo)
    return library