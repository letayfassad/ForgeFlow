"""Unit tests for open_application resolve + launch."""

import unittest
from unittest.mock import patch

from forgeflow_runner.handlers.open_app import launch, resolve_executable


class TestOpenApp(unittest.TestCase):
    def test_resolve_maps_known_apps(self):
        self.assertEqual(resolve_executable("Calculator"), "calc.exe")
        self.assertEqual(resolve_executable("notepad"), "notepad.exe")

    @patch("forgeflow_runner.handlers.open_app.subprocess.Popen")
    def test_launch_exe_no_shell_true(self, mock_popen):
        launch("notepad.exe")
        mock_popen.assert_called_once()
        call_args, call_kwargs = mock_popen.call_args
        self.assertEqual(call_args[0], ["notepad.exe"])
        self.assertNotIn("shell", call_kwargs)


if __name__ == "__main__":
    unittest.main()