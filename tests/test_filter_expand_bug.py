import re
import unittest
from pathlib import Path


class FilterExpandBugTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_manual_expand_resets_last_scroll_anchor_after_auto_collapse(self):
        required_patterns = [
            r'btn\.addEventListener\(\'click\',\(\)=>\{',
            r'S\.filterCollapsed=!S\.filterCollapsed',
            r'S\.lastHomeScrollTop\s*=\s*\$\(\'vHome\'\)\?\.scrollTop\s*\?\?\s*S\.lastHomeScrollTop',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
