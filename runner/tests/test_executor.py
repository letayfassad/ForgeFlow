"""Unit tests for action executor."""

import unittest
from unittest.mock import MagicMock, patch

from forgeflow_runner.executor import ActionExecutor
from forgeflow_runner.schema import validate_sequence


class TestExecutor(unittest.TestCase):
    def _make_test_sequence(self):
        return validate_sequence(
            {
                "version": "1.0",
                "actions": [
                    {"type": "move_mouse", "x": 10, "y": 20, "duration": 0.1},
                    {"type": "wait", "seconds": 0.1},
                    {"type": "type_text", "text": "hi", "interval": 0.01},
                    {"type": "click", "x": 10, "y": 20},
                    {"type": "double_click", "x": 10, "y": 20},
                    {"type": "right_click", "x": 10, "y": 20},
                    {"type": "click"},
                    {"type": "press_key", "key": "enter"},
                    {"type": "hotkey", "keys": ["ctrl", "s"]},
                    {"type": "scroll", "amount": -3},
                    {"type": "open_application", "target": "calc"},
                ],
            }
        )

    @patch("forgeflow_runner.handlers.open_app.launch")
    @patch("forgeflow_runner.handlers.scroll.mouse")
    @patch("forgeflow_runner.handlers.keys.keyboard")
    @patch("forgeflow_runner.handlers.mouse.mouse")
    @patch("forgeflow_runner.executor._keyboard_controller")
    @patch("forgeflow_runner.executor._mouse_controller")
    @patch("forgeflow_runner.executor.pyautogui")
    def test_execute_calls_libs_with_timing(
        self,
        mock_pyautogui,
        mock_mouse_ctrl,
        mock_kb_ctrl,
        mock_mouse_lib,
        mock_keyboard,
        mock_scroll_mouse,
        mock_launch,
    ):
        mock_mouse_ctrl.position = (0, 0)
        mock_pyautogui.position.return_value = (0, 0)
        executor = ActionExecutor(dry_run=False)

        result = executor.execute(self._make_test_sequence())

        self.assertTrue(result.success)
        self.assertEqual(result.steps_completed, 11)
        mock_pyautogui.click.assert_called_once_with(10, 20, button="left")
        mock_pyautogui.doubleClick.assert_called_once_with(10, 20)
        mock_pyautogui.rightClick.assert_called_once_with(10, 20)
        mock_mouse_lib.click.assert_called_once_with(button="left")
        mock_keyboard.press_and_release.assert_called()
        mock_keyboard.send.assert_called_once_with("ctrl+s")
        mock_scroll_mouse.wheel.assert_called_once_with(-3)
        mock_launch.assert_called_once_with("calc.exe")

        libs = {t["type"]: t["library"] for t in result.timing_log}
        self.assertEqual(libs["move_mouse"], "pynput")
        self.assertEqual(libs["type_text"], "pynput")
        self.assertEqual(libs["open_application"], "subprocess")

    @patch("forgeflow_runner.handlers.open_app.launch")
    @patch("forgeflow_runner.handlers.scroll.mouse")
    @patch("forgeflow_runner.handlers.keys.keyboard")
    @patch("forgeflow_runner.handlers.mouse.mouse")
    @patch("forgeflow_runner.executor._keyboard_controller")
    @patch("forgeflow_runner.executor._mouse_controller")
    @patch("forgeflow_runner.executor.pyautogui")
    def test_execute_consistent_success_twice(
        self,
        mock_pyautogui,
        mock_mouse_ctrl,
        mock_kb_ctrl,
        mock_mouse_lib,
        mock_keyboard,
        mock_scroll_mouse,
        mock_launch,
    ):
        mock_mouse_ctrl.position = (0, 0)
        mock_pyautogui.position.return_value = (0, 0)
        executor = ActionExecutor(dry_run=False)
        sequence = self._make_test_sequence()

        for _ in range(2):
            result = executor.execute(sequence)
            self.assertTrue(result.success)
            self.assertEqual(len(result.timing_log), 11)

    @patch("forgeflow_runner.executor.pyautogui")
    def test_stop_interrupts_wait_mid_action(self, mock_pyautogui):
        mock_pyautogui.position.return_value = (0, 0)
        executor = ActionExecutor(dry_run=False)
        sequence = validate_sequence(
            {
                "version": "1.0",
                "actions": [{"type": "wait", "seconds": 1.0}],
            }
        )

        sleep_calls = 0

        def sleep_side_effect(seconds):
            nonlocal sleep_calls
            sleep_calls += 1
            if sleep_calls >= 2:
                executor.request_stop()

        with patch("forgeflow_runner.handlers.context.time.sleep", side_effect=sleep_side_effect):
            result = executor.execute(sequence)

        self.assertFalse(result.success)
        self.assertTrue(result.stopped)
        self.assertEqual(result.steps_completed, 1)

    def test_stop_requested_mid_execution(self):
        executor = ActionExecutor(dry_run=True)
        long_sequence = validate_sequence(
            {
                "version": "1.0",
                "actions": [
                    {"type": "wait", "seconds": 0.01},
                    {"type": "wait", "seconds": 0.01},
                ],
            }
        )

        def stop_after_first(step: int, _total: int, _action: str) -> None:
            if step == 1:
                executor.request_stop()

        executor._on_progress = stop_after_first
        result = executor.execute(long_sequence)
        self.assertFalse(result.success)
        self.assertTrue(result.stopped)

    def test_dry_run_completes(self):
        progress_calls = []
        executor = ActionExecutor(
            dry_run=True,
            on_progress=lambda s, t, a: progress_calls.append((s, t, a)),
        )
        result = executor.execute(self._make_test_sequence())
        self.assertTrue(result.success)
        self.assertEqual(len(progress_calls), 11)


if __name__ == "__main__":
    unittest.main()