import re
import unittest
from pathlib import Path


class HomePreviewPerformanceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_all_photo_mode_uses_intersection_observer_lazy_loading(self):
        required_patterns = [
            r'IntersectionObserver',
            r'rootMargin:\s*[\'\"]200px[\'\"]',
            r'obs\.observe\(',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_all_photo_mode_handles_video_without_black_img_fallback(self):
        required_patterns = [
            r'photo\.isVideo',
            r'createElement\([\'\"]video[\'\"]\)',
            r'photo\.poster',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
