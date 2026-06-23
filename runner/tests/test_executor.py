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
                    {"type": "click"},
                ],
            }
        )

    @patch("forgeflow_runner.executor.pyautogui")
    def test_execute_calls_pyautogui_with_timing(self, mock_pyautogui):
        executor = ActionExecutor(dry_run=False)
        executor._pyautogui = mock_pyautogui

        sequence = self._make_test_sequence()
        result = executor.execute(sequence)

        self.assertTrue(result.success)
        self.assertEqual(result.steps_completed, 4)
        mock_pyautogui.moveTo.assert_called_once_with(10, 20, duration=0.1)
        mock_pyautogui.write.assert_called_once_with("hi", interval=0.01)
        mock_pyautogui.click.assert_called_once()

    @patch("forgeflow_runner.executor.pyautogui")
    def test_execute_consistent_success_twice(self, mock_pyautogui):
        executor = ActionExecutor(dry_run=False)
        executor._pyautogui = mock_pyautogui
        sequence = self._make_test_sequence()

        for _ in range(2):
            result = executor.execute(sequence)
            self.assertTrue(result.success)
            self.assertEqual(len(result.timing_log), 4)

    def test_stop_requested_mid_execution(self):
        executor = ActionExecutor(dry_run=True)
        long_sequence = validate_sequence(
            {
                "version": "1.0",
                "actions": [
                    {"type": "wait", "seconds": 0.01},
                    {"type": "wait", "seconds": 0.01},
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
        self.assertEqual(result.steps_completed, 1)

    def test_dry_run_completes(self):
        progress_calls = []
        executor = ActionExecutor(
            dry_run=True,
            on_progress=lambda s, t, a: progress_calls.append((s, t, a)),
        )
        result = executor.execute(self._make_test_sequence())
        self.assertTrue(result.success)
        self.assertEqual(len(progress_calls), 4)


if __name__ == "__main__":
    unittest.main()