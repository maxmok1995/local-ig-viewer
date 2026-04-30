import re
import unittest
from pathlib import Path


class HomePreviewGroupingTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_all_photo_mode_groups_cards(self):
        required_patterns = [
            r'homePhotoGroup',
            r'homePhotoGroupTitle',
            r'itemsByAlbum',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_all_photo_mode_has_clearer_photo_meta_labels(self):
        required_patterns = [
            r'homePhotoMeta',
            r'previewPhotoIndex',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
