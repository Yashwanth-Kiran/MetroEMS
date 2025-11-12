import unittest
from Backend_for_station_Radios.logs_utils import _classify_severity, _parse_time_from_text, _parse_syslog_line

class TestLogsUtils(unittest.TestCase):
    def test_classify_severity(self):
        self.assertEqual(_classify_severity("Interface down on port 1"), "ERROR")
        self.assertEqual(_classify_severity("Link up on port 1"), "INFO")
        self.assertEqual(_classify_severity("Warning: temperature high"), "WARN")
        self.assertEqual(_classify_severity("unknown token"), "UNKNOWN")

    def test_parse_time_from_text_iso(self):
        t = _parse_time_from_text("2025-10-31T12:34:56+00:00 message text")
        self.assertIsInstance(t, str)
        self.assertTrue(t.startswith("2025-10-31T12:34:56"))

    def test_parse_time_from_text_syslog(self):
        sample = "Oct 31 12:34:56 host process: something happened"
        t = _parse_time_from_text(sample)
        self.assertIsNotNone(t)

    def test_parse_syslog_line(self):
        line = "Oct 31 12:34:56 host daemon[123]: Link up on eth0"
        parsed = _parse_syslog_line(line)
        self.assertIn("time", parsed)
        self.assertIn("type", parsed)
        self.assertIn("message", parsed)
        self.assertEqual(parsed["type"], "INFO")
        self.assertTrue(parsed["message"].startswith("Link up"))

if __name__ == '__main__':
    unittest.main()
