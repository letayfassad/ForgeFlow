"""Mouse movement and click handlers (pynput + pyautogui + mouse)."""

from __future__ import annotations

import time

import mouse

from ..schema import ClickAction, DoubleClickAction, MoveMouseAction, RightClickAction
from .context import HandlerContext


def _move_mouse(ctx: HandlerContext, x: float, y: float, duration: float) -> None:
    start_x, start_y = ctx.mouse_ctrl.position
    steps = max(int(duration / 0.02), 1)
    step_delay = duration / steps
    for i in range(1, steps + 1):
        if ctx.stop_requested():
            return
        t = i / steps
        nx = int(start_x + (x - start_x) * t)
        ny = int(start_y + (y - start_y) * t)
        ctx.mouse_ctrl.position = (nx, ny)
        time.sleep(step_delay)


def handle_move(action: MoveMouseAction, ctx: HandlerContext) -> str:
    library = "pynput"
    ctx.log_action(action.type, library, x=action.x, y=action.y, duration=action.duration)
    if not ctx.dry_run:
        _move_mouse(ctx, action.x, action.y, action.duration)
    return library


def handle_click(action: ClickAction, ctx: HandlerContext) -> str:
    if action.x is not None and action.y is not None:
        library = "pyautogui"
        ctx.log_action(action.type, library, x=action.x, y=action.y, button=action.button)
        if not ctx.dry_run:
            ctx.pyautogui.click(action.x, action.y, button=action.button)
    else:
        library = "mouse"
        ctx.log_action(action.type, library, button=action.button)
        if not ctx.dry_run:
            button = action.button if action.button != "middle" else "left"
            mouse.click(button=button)
    return library


def handle_double_click(action: DoubleClickAction, ctx: HandlerContext) -> str:
    if action.x is not None and action.y is not None:
        library = "pyautogui"
        ctx.log_action(action.type, library, x=action.x, y=action.y)
        if not ctx.dry_run:
            ctx.pyautogui.doubleClick(action.x, action.y)
    else:
        library = "mouse"
        ctx.log_action(action.type, library)
        if not ctx.dry_run:
            mouse.double_click()
    return library


def handle_right_click(action: RightClickAction, ctx: HandlerContext) -> str:
    if action.x is not None and action.y is not None:
        library = "pyautogui"
        ctx.log_action(action.type, library, x=action.x, y=action.y)
        if not ctx.dry_run:
            ctx.pyautogui.rightClick(action.x, action.y)
    else:
        library = "mouse"
        ctx.log_action(action.type, library)
        if not ctx.dry_run:
            mouse.right_click()
    return library