import re
import unittest
from pathlib import Path


class LightboxCaptionFurtherPolishTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_lightbox_caption_has_clearer_placeholder_and_footer_divider(self):
        required_patterns = [
            r'\.lbFoot\s*\{[^}]*border-top:1px solid var\(--border\)',
            r'\.lbCaption::placeholder\s*\{[^}]*color:#777',
            r'\.lbCaptionWrap\s*\{[^}]*padding:8px 10px',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
