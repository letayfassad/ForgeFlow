"""Scroll handler."""

from __future__ import annotations

import mouse

from ..schema import ScrollAction
from .context import HandlerContext


def handle(action: ScrollAction, ctx: HandlerContext) -> str:
    library = "mouse"
    ctx.log_action(action.type, library, amount=action.amount)
    if not ctx.dry_run:
        mouse.wheel(action.amount)
    return library