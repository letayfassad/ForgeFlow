"""Action schema validation and normalization — mirrors web/src/lib/schema.ts."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Literal, Union

SCHEMA_VERSION = "1.0"

SAFETY_LIMITS = {
    "max_mouse_duration": 30.0,
    "min_mouse_duration": 0.05,
    "max_type_interval": 2.0,
    "min_type_interval": 0.01,
    "min_wait_seconds": 0.05,
    "max_wait_seconds": 300.0,
}


class SchemaValidationError(ValueError):
    pass


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


@dataclass
class MoveMouseAction:
    type: Literal["move_mouse"] = "move_mouse"
    x: float = 0
    y: float = 0
    duration: float = 0.5
    label: str | None = None


@dataclass
class ClickAction:
    type: Literal["click"] = "click"
    x: float | None = None
    y: float | None = None
    button: Literal["left", "right", "middle"] = "left"
    label: str | None = None


@dataclass
class DoubleClickAction:
    type: Literal["double_click"] = "double_click"
    x: float | None = None
    y: float | None = None
    label: str | None = None


@dataclass
class RightClickAction:
    type: Literal["right_click"] = "right_click"
    x: float | None = None
    y: float | None = None
    label: str | None = None


@dataclass
class TypeTextAction:
    type: Literal["type_text"] = "type_text"
    text: str = ""
    interval: float = 0.05
    label: str | None = None


@dataclass
class PressKeyAction:
    type: Literal["press_key"] = "press_key"
    key: str = ""
    label: str | None = None


@dataclass
class HotkeyAction:
    type: Literal["hotkey"] = "hotkey"
    keys: list[str] = field(default_factory=list)
    label: str | None = None


@dataclass
class WaitAction:
    type: Literal["wait"] = "wait"
    seconds: float = 1.0
    label: str | None = None


@dataclass
class OpenApplicationAction:
    type: Literal["open_application"] = "open_application"
    target: str = ""
    label: str | None = None


@dataclass
class ScrollAction:
    type: Literal["scroll"] = "scroll"
    amount: int = 0
    x: float | None = None
    y: float | None = None
    label: str | None = None


ForgeAction = Union[
    MoveMouseAction,
    ClickAction,
    DoubleClickAction,
    RightClickAction,
    TypeTextAction,
    PressKeyAction,
    HotkeyAction,
    WaitAction,
    OpenApplicationAction,
    ScrollAction,
]


@dataclass
class ActionSequence:
    version: str
    actions: list[ForgeAction]
    name: str | None = None
    description: str | None = None


def normalize_action(action: ForgeAction) -> ForgeAction:
    if isinstance(action, MoveMouseAction):
        action.duration = _clamp(
            action.duration,
            SAFETY_LIMITS["min_mouse_duration"],
            SAFETY_LIMITS["max_mouse_duration"],
        )
    elif isinstance(action, TypeTextAction):
        action.interval = _clamp(
            action.interval,
            SAFETY_LIMITS["min_type_interval"],
            SAFETY_LIMITS["max_type_interval"],
        )
    elif isinstance(action, WaitAction):
        action.seconds = _clamp(
            action.seconds,
            SAFETY_LIMITS["min_wait_seconds"],
            SAFETY_LIMITS["max_wait_seconds"],
        )
    return action


def _parse_action(data: dict[str, Any]) -> ForgeAction:
    action_type = data.get("type")
    if not action_type:
        raise SchemaValidationError("Action type is required")

    label = data.get("label")

    if action_type == "move_mouse":
        if "x" not in data or "y" not in data:
            raise SchemaValidationError("move_mouse requires x and y")
        return normalize_action(
            MoveMouseAction(
                x=float(data["x"]),
                y=float(data["y"]),
                duration=float(data.get("duration", 0.5)),
                label=label,
            )
        )
    if action_type == "click":
        return normalize_action(
            ClickAction(
                x=data.get("x"),
                y=data.get("y"),
                button=data.get("button", "left"),
                label=label,
            )
        )
    if action_type == "double_click":
        return DoubleClickAction(x=data.get("x"), y=data.get("y"), label=label)
    if action_type == "right_click":
        return RightClickAction(x=data.get("x"), y=data.get("y"), label=label)
    if action_type == "type_text":
        if "text" not in data:
            raise SchemaValidationError("type_text requires text")
        return normalize_action(
            TypeTextAction(
                text=str(data["text"]),
                interval=float(data.get("interval", 0.05)),
                label=label,
            )
        )
    if action_type == "press_key":
        if "key" not in data:
            raise SchemaValidationError("press_key requires key")
        return PressKeyAction(key=str(data["key"]), label=label)
    if action_type == "hotkey":
        keys = data.get("keys", [])
        if not isinstance(keys, list) or len(keys) < 2:
            raise SchemaValidationError("hotkey requires at least 2 keys")
        return HotkeyAction(keys=[str(k) for k in keys], label=label)
    if action_type == "wait":
        if "seconds" not in data:
            raise SchemaValidationError("wait requires seconds")
        return normalize_action(WaitAction(seconds=float(data["seconds"]), label=label))
    if action_type == "open_application":
        if "target" not in data:
            raise SchemaValidationError("open_application requires target")
        return OpenApplicationAction(target=str(data["target"]), label=label)
    if action_type == "scroll":
        if "amount" not in data:
            raise SchemaValidationError("scroll requires amount")
        return ScrollAction(
            amount=int(data["amount"]),
            x=data.get("x"),
            y=data.get("y"),
            label=label,
        )

    raise SchemaValidationError(f"Unknown action type: {action_type}")


def validate_sequence(data: dict[str, Any]) -> ActionSequence:
    actions_raw = data.get("actions")
    if not isinstance(actions_raw, list) or len(actions_raw) == 0:
        raise SchemaValidationError("Sequence must have at least one action")

    actions = [_parse_action(a) for a in actions_raw]
    return ActionSequence(
        version=SCHEMA_VERSION,
        name=data.get("name"),
        description=data.get("description"),
        actions=actions,
    )


def serialize_sequence(sequence: ActionSequence) -> str:
    def action_to_dict(action: ForgeAction) -> dict[str, Any]:
        result: dict[str, Any] = {"type": action.type}
        if action.label:
            result["label"] = action.label
        if isinstance(action, MoveMouseAction):
            result.update({"x": action.x, "y": action.y, "duration": action.duration})
        elif isinstance(action, ClickAction):
            if action.x is not None:
                result["x"] = action.x
            if action.y is not None:
                result["y"] = action.y
            result["button"] = action.button
        elif isinstance(action, (DoubleClickAction, RightClickAction)):
            if action.x is not None:
                result["x"] = action.x
            if action.y is not None:
                result["y"] = action.y
        elif isinstance(action, TypeTextAction):
            result.update({"text": action.text, "interval": action.interval})
        elif isinstance(action, PressKeyAction):
            result["key"] = action.key
        elif isinstance(action, HotkeyAction):
            result["keys"] = action.keys
        elif isinstance(action, WaitAction):
            result["seconds"] = action.seconds
        elif isinstance(action, OpenApplicationAction):
            result["target"] = action.target
        elif isinstance(action, ScrollAction):
            result["amount"] = action.amount
            if action.x is not None:
                result["x"] = action.x
            if action.y is not None:
                result["y"] = action.y
        return result

    payload = {
        "version": SCHEMA_VERSION,
        "actions": [action_to_dict(a) for a in sequence.actions],
    }
    if sequence.name:
        payload["name"] = sequence.name
    if sequence.description:
        payload["description"] = sequence.description
    return json.dumps(payload, indent=2)


def deserialize_sequence(json_str: str) -> ActionSequence:
    return validate_sequence(json.loads(json_str))


def action_to_dict(action: ForgeAction) -> dict[str, Any]:
    """Public helper for tests and executor."""
    return json.loads(
        serialize_sequence(ActionSequence(version=SCHEMA_VERSION, actions=[action]))
    )["actions"][0]