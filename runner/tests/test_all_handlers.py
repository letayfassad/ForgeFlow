"""Table-driven handler coverage — every v1 action type through shipped handlers."""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from forgeflow_runner.handlers import HANDLERS, HandlerContext, execute_action
from forgeflow_runner.handlers.open_app import launch, resolve_executable
from forgeflow_runner.schema import validate_sequence

SHARED_SEQ = Path(__file__).resolve().parents[2] / "shared" / "verification-sequence.json"
VERIFICATION_SEQUENCE = validate_sequence(json.loads(SHARED_SEQ.read_text(encoding="utf-8")))


def _ctx(dry_run: bool = False) -> HandlerContext:
    return HandlerContext(
        dry_run=dry_run,
        stop_requested=lambda: False,
        pyautogui=MagicMock(),
        mouse_ctrl=MagicMock(),
        keyboard_ctrl=MagicMock(),
    )


class TestHandlerRegistry(unittest.TestCase):
    def test_registry_covers_all_v1_types(self):
        action_types = {a.type for a in VERIFICATION_SEQUENCE.actions}
        self.assertEqual(len(action_types), 10)
        for action_type in action_types:
            self.assertIn(action_type, HANDLERS)

    def test_verification_sequence_has_ten_distinct_types(self):
        types = [a.type for a in VERIFICATION_SEQUENCE.actions]
        self.assertEqual(len(set(types)), 10)


class TestOpenApplicationHandler(unittest.TestCase):
    def test_resolve_executable_notepad(self):
        self.assertEqual(resolve_executable("notepad"), "notepad.exe")

    def test_resolve_executable_calc_alias(self):
        self.assertEqual(resolve_executable("calc"), "calc.exe")

    @patch("forgeflow_runner.handlers.open_app.subprocess.Popen")
    def test_launch_uses_popen_list_without_shell(self, mock_popen):
        launch("calc.exe")
        mock_popen.assert_called_once()
        args, kwargs = mock_popen.call_args
        self.assertEqual(args[0], ["calc.exe"])
        self.assertNotIn("shell", kwargs)
        self.assertTrue(kwargs.get("creationflags"))

    @patch("forgeflow_runner.handlers.open_app.launch")
    def test_handle_open_application_invokes_launch(self, mock_launch):
        seq = validate_sequence(
            {"version": "1.0", "actions": [{"type": "open_application", "target": "calc"}]}
        )
        action = seq.actions[0]
        library = execute_action(action, _ctx(dry_run=False))
        self.assertEqual(library, "subprocess")
        mock_launch.assert_called_once_with("calc.exe")


class TestAllHandlersInvoked(unittest.TestCase):
    """Each action in the canonical verification sequence invokes its handler once."""

    @patch("forgeflow_runner.handlers.open_app.launch")
    @patch("forgeflow_runner.handlers.scroll.mouse")
    @patch("forgeflow_runner.handlers.keys.keyboard")
    @patch("forgeflow_runner.handlers.mouse.mouse")
    def test_each_handler_invoked_once(
        self, mock_mouse_lib, mock_keyboard, mock_scroll_mouse, mock_launch
    ):
        ctx = _ctx(dry_run=False)
        ctx.mouse_ctrl.position = (0, 0)
        seen: set[str] = set()

        for action in VERIFICATION_SEQUENCE.actions:
            execute_action(action, ctx)
            seen.add(action.type)

        self.assertEqual(seen, {
            "move_mouse", "wait", "type_text", "click", "double_click", "right_click",
            "press_key", "hotkey", "scroll", "open_application",
        })
        mock_launch.assert_called_once()
        self.assertGreaterEqual(mock_keyboard.press_and_release.call_count, 1)
        self.assertGreaterEqual(mock_keyboard.send.call_count, 1)
        mock_scroll_mouse.wheel.assert_called_once()


if __name__ == "__main__":
    unittest.main()