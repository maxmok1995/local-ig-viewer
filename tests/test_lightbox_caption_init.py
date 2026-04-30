import re
import unittest
from pathlib import Path


class LightboxCaptionInitTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_open_lightbox_shows_view_before_rendering_caption(self):
        required_patterns = [
            r'function\s+openLB\(alb,idx\)\{\s*S\.currentAlbum=alb;S\.currentIdx=idx;\s*showView\(["\']lb["\']\);\s*renderLB\(\);',
            r'setTimeout\(\(\)=>ar\(lbCaption\),0\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
