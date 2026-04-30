import re
import unittest
from pathlib import Path


class HomePreviewToggleTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_state_contains_home_preview_mode(self):
        self.assertIn("homePreviewMode:'albums'", self.html)

    def test_home_preview_toggle_and_all_photo_renderer_exist(self):
        required_patterns = [
            r'homePreviewBar',
            r'function\s+buildHomePreviewBar\s*\(',
            r'function\s+renderHomePhotoGrid\s*\(',
            r'openLB\(alb,\s*alb\.photos\.indexOf\(photo\)\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
