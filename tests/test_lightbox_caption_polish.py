import re
import unittest
from pathlib import Path


class LightboxCaptionPolishTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_lightbox_caption_has_stable_min_height_and_empty_state_hook(self):
        required_patterns = [
            r'\.lbCaption\s*\{[^}]*min-height:\s*44px',
            r'\.lbCaption\.empty\s*\{',
            r'lbCaption\.classList\.toggle\(["\']empty["\']',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
