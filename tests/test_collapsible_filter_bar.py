import re
import unittest
from pathlib import Path


class CollapsibleFilterBarTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_home_header_places_preview_bar_before_search_and_filters(self):
        required_patterns = [
            r'function\s+syncHomeHeaderModes\s*\(',
            r'hdrHomeModes',
            r'stickyTop\.appendChild\(buildSearchBar\(\)\);',
            r'stickyTop\.appendChild\(buildFilterSection\(\)\);',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_filter_bar_has_collapsible_section_and_toggle_arrow(self):
        required_patterns = [
            r'function\s+buildFilterSection\s*\(',
            r'filterSection',
            r'filterCollapseBtn',
            r'filterCollapsed',
            r'textContent\s*=\s*S\.filterCollapsed\s*\?\s*["\']▾["\']\s*:\s*["\']▴["\']',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_home_scroll_handler_auto_collapses_filter_bar_on_scroll_down(self):
        required_patterns = [
            r'function\s+handleHomeScroll\s*\(',
            r'scrollTop\s*>\s*S\.lastHomeScrollTop',
            r'S\.filterCollapsed\s*=\s*true',
            r"\$\('vHome'\)\.addEventListener\([\"\']scroll[\"\']\s*,\s*handleHomeScroll\)",
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
