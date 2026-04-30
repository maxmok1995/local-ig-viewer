import re
import unittest
from pathlib import Path


class CompatibilityUiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_compatibility_panel_markup_exists(self):
        required_ids = ['compatPanel', 'compatTitle', 'compatBody']
        for element_id in required_ids:
            self.assertRegex(self.html, rf'id="{re.escape(element_id)}"', msg=f'missing compatibility UI element: {element_id}')

    def test_compatibility_detection_functions_exist(self):
        required_patterns = [
            r'function\s+getCompatibilityStatus\s*\(',
            r'function\s+renderCompatibilityStatus\s*\(',
            r'renderCompatibilityStatus\s*\(\s*\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=f'missing compatibility logic: {pattern}')


if __name__ == '__main__':
    unittest.main()
