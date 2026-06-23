"""Wait/delay handler."""

from __future__ import annotations

from ..schema import WaitAction
from .context import HandlerContext


def handle(action: WaitAction, ctx: HandlerContext) -> str:
    library = "stdlib"
    ctx.log_action(action.type, library, seconds=action.seconds)
    if not ctx.dry_run:
        ctx.interruptible_sleep(action.seconds)
    return library