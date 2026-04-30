import re
import unittest
from pathlib import Path


class FilterExpandRuntimeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_filter_collapse_button_state_is_synced_after_auto_collapse(self):
        required_patterns = [
            r'function\s+syncFilterCollapseBtn\s*\(',
            r'btn\.title\s*=\s*S\.filterCollapsed\s*\?\s*["\']展開標籤欄["\']\s*:\s*["\']收起標籤欄["\']',
            r'btn\.textContent\s*=\s*S\.filterCollapsed\s*\?\s*["\']▾["\']\s*:\s*["\']▴["\']',
            r'handleHomeScroll\(\).*?syncFilterCollapseBtn\(',
            r'buildSearchBar\(\).*?syncFilterCollapseBtn\(',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
