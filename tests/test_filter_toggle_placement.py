import re
import unittest
from pathlib import Path


class FilterTogglePlacementTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_search_bar_contains_filter_collapse_button(self):
        required_patterns = [
            r'function\s+buildSearchBar\s*\(',
            r'filterCollapseBtn',
            r'wrap\.appendChild\(btn\)',
            r'btn\.id\s*=\s*["\']filterCollapseBtn["\']',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_filter_section_no_longer_uses_separate_header_row(self):
        forbidden_patterns = [
            r'filterSectionHead',
            r'section\.appendChild\(head\)',
        ]
        for pattern in forbidden_patterns:
            self.assertIsNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_search_layout_has_inline_space_for_filter_toggle(self):
        required_patterns = [
            r'\.homeSearch\s*\{[^}]*gap:8px',
            r'#homeSearchInp\s*\{[^}]*flex:1',
            r'#filterCollapseBtn\s*\{',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
