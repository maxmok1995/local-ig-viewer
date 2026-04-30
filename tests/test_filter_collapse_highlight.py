import re
import unittest
from pathlib import Path


class FilterCollapseHighlightTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_auto_collapsed_state_has_visual_highlight_hook(self):
        required_patterns = [
            r'filterAutoCollapsedHint\s*:\s*false',
            r'#filterCollapseBtn\.autoHint\s*\{',
            r'btn\.classList\.toggle\(["\']autoHint["\']\s*,\s*S\.filterAutoCollapsedHint\)',
            r'S\.filterAutoCollapsedHint\s*=\s*true',
            r'S\.filterAutoCollapsedHint\s*=\s*false',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
