import re
import unittest
from pathlib import Path


class HomeHeaderPreviewBarTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_header_has_dedicated_home_preview_row(self):
        required_patterns = [
            r'id="hdrHomeModes"',
            r'function\s+syncHomeHeaderModes\s*\(',
            r'hdrHomeModeBtn',
            r'row\.appendChild',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_home_mode_buttons_live_between_title_and_sort_button(self):
        required_patterns = [
            r'id="hdrTitle"',
            r'id="hdrHomeModes"',
            r'id="btnSort"',
            r'#hdrMainRow\s*\{',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)
        self.assertLess(self.html.index('id="hdrTitle"'), self.html.index('id="hdrHomeModes"'))
        self.assertLess(self.html.index('id="hdrHomeModes"'), self.html.index('id="btnSort"'))

    def test_home_mode_row_uses_segmented_control_style_and_hides_extra_gap(self):
        required_patterns = [
            r'#hdrHomeModes\s*\{[^}]*width:max-content',
            r'overflow:hidden',
            r'\.hdrHomeModeBtn\.active\{',
            r'extraBtn\.hidden\s*=\s*S\.homePreviewMode!==["\']photos["\']',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
