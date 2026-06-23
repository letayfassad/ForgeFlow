"""Unit tests for action schema validation."""

import json
import unittest

from forgeflow_runner.schema import (
    ClickAction,
    HotkeyAction,
    MoveMouseAction,
    OpenApplicationAction,
    PressKeyAction,
    RightClickAction,
    ScrollAction,
    TypeTextAction,
    WaitAction,
    deserialize_sequence,
    serialize_sequence,
    validate_sequence,
    DoubleClickAction,
)


class TestSchema(unittest.TestCase):
    def test_all_action_types_validate(self):
        sequence = validate_sequence(
            {
                "version": "1.0",
                "name": "Full Coverage",
                "actions": [
                    {"type": "move_mouse", "x": 100, "y": 200, "duration": 0.3},
                    {"type": "click", "x": 50, "y": 60},
                    {"type": "double_click", "x": 70, "y": 80},
                    {"type": "right_click", "x": 90, "y": 100},
                    {"type": "type_text", "text": "hello", "interval": 0.02},
                    {"type": "press_key", "key": "enter"},
                    {"type": "hotkey", "keys": ["ctrl", "s"]},
                    {"type": "wait", "seconds": 1.5},
                    {"type": "open_application", "target": "notepad"},
                    {"type": "scroll", "amount": -5},
                ],
            }
        )
        self.assertEqual(len(sequence.actions), 10)
        self.assertIsInstance(sequence.actions[0], MoveMouseAction)
        self.assertIsInstance(sequence.actions[1], ClickAction)
        self.assertIsInstance(sequence.actions[2], DoubleClickAction)
        self.assertIsInstance(sequence.actions[3], RightClickAction)
        self.assertIsInstance(sequence.actions[4], TypeTextAction)
        self.assertIsInstance(sequence.actions[5], PressKeyAction)
        self.assertIsInstance(sequence.actions[6], HotkeyAction)
        self.assertIsInstance(sequence.actions[7], WaitAction)
        self.assertIsInstance(sequence.actions[8], OpenApplicationAction)
        self.assertIsInstance(sequence.actions[9], ScrollAction)

    def test_serialize_deserialize_roundtrip(self):
        original = {
            "version": "1.0",
            "name": "Roundtrip",
            "description": "test",
            "actions": [
                {"type": "move_mouse", "x": 10, "y": 20, "duration": 1.0, "label": "move"},
                {"type": "type_text", "text": "ForgeFlow", "interval": 0.1},
            ],
        }
        seq = validate_sequence(original)
        json_str = serialize_sequence(seq)
        restored = deserialize_sequence(json_str)
        self.assertEqual(restored.name, "Roundtrip")
        self.assertEqual(restored.description, "test")
        self.assertEqual(len(restored.actions), 2)
        move = restored.actions[0]
        assert isinstance(move, MoveMouseAction)
        self.assertEqual(move.x, 10)
        self.assertEqual(move.duration, 1.0)

    def test_wait_honors_minimum_seconds(self):
        seq = validate_sequence(
            {
                "version": "1.0",
                "actions": [{"type": "wait", "seconds": 0.05}],
            }
        )
        wait = seq.actions[0]
        assert isinstance(wait, WaitAction)
        self.assertEqual(wait.seconds, 0.05)

    def test_safety_clamping(self):
        seq = validate_sequence(
            {
                "version": "1.0",
                "actions": [
                    {"type": "move_mouse", "x": 0, "y": 0, "duration": 100},
                    {"type": "type_text", "text": "x", "interval": 10},
                    {"type": "wait", "seconds": 500},
                ],
            }
        )
        move = seq.actions[0]
        assert isinstance(move, MoveMouseAction)
        self.assertEqual(move.duration, 30.0)
        typ = seq.actions[1]
        assert isinstance(typ, TypeTextAction)
        self.assertEqual(typ.interval, 2.0)
        wait = seq.actions[2]
        assert isinstance(wait, WaitAction)
        self.assertEqual(wait.seconds, 300.0)

    def test_invalid_sequence_raises(self):
        with self.assertRaises(Exception):
            validate_sequence({"version": "1.0", "actions": []})


if __name__ == "__main__":
    unittest.main()