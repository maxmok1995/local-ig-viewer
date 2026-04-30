import re
import unittest
from pathlib import Path


class FilterExpandCooldownTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_manual_toggle_starts_short_scroll_cooldown(self):
        required_patterns = [
            r'filterToggleCooldownUntil\s*:\s*0',
            r'S\.filterToggleCooldownUntil\s*=\s*Date\.now\(\)\s*\+\s*600',
            r'if\(Date\.now\(\)\s*<\s*S\.filterToggleCooldownUntil\)\s*\{\s*S\.lastHomeScrollTop\s*=\s*scrollTop;\s*return;\s*\}',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
