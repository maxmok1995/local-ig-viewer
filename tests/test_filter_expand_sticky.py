import re
import unittest
from pathlib import Path


class FilterExpandStickyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_manual_expand_sets_sticky_override_until_user_scrolls_up(self):
        required_patterns = [
            r'filterManualExpandLock\s*:\s*false',
            r'S\.filterManualExpandLock\s*=\s*!S\.filterCollapsed',
            r'if\(S\.filterManualExpandLock\)\s*\{',
            r'if\(scrollTop\s*<\s*S\.lastHomeScrollTop\)\s*S\.filterManualExpandLock\s*=\s*false',
            r'else\s*\{\s*S\.lastHomeScrollTop\s*=\s*scrollTop;\s*return;\s*\}',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
