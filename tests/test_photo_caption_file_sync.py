import re
import unittest
from pathlib import Path


class PhotoCaptionFileSyncTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_photo_caption_supports_full_filename_sidecar_lookup(self):
        required_patterns = [
            r'function\s+getTxtCaptionForPhoto\s*\(',
            r'photoName\.replace\(/\\\.\\w\+\$/',
            r'txtMap\[photoName\]',
            r'txtMap\[base\]',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_photo_caption_edit_writes_back_to_sidecar_txt(self):
        required_patterns = [
            r'async\s+function\s+writePhotoCaptionSidecar\s*\(',
            r'getFileHandle\([^\n]*\.txt',
            r'createWritable\(',
            r'writePhotoCaptionSidecar\(alb,\s*photo,\s*ta\.value\)',
            r'writePhotoCaptionSidecar\(alb,\s*photo,\s*lbCaption\.value\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
