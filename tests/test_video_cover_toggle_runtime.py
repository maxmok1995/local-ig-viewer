import re
import unittest
from pathlib import Path


class VideoCoverToggleRuntimeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_cover_images_are_marked_not_dropped_at_load_time(self):
        required_patterns = [
            r'cover\._isVideoCover\s*=\s*true',
            r'const\s+photos\s*=\s*\[\.\.\.images,\.\.\.videos\]',
            r'const\s+displayPhotos\s*=\s*\[\.\.\.images,\.\.\.videos\]',
            r'const\s+rootPhotos\s*=\s*\[\.\.\.rootLooseImgs,\.\.\.rootLooseVids\]',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_home_all_photos_view_filters_marked_cover_images_at_render_time(self):
        required_patterns = [
            r'itemsByAlbum\.set\(alb\.name,\s*alb\.photos\.filter\(photo=>S\.showVideoCoverPhotos\|\|!photo\._isVideoCover\)',
            r'const\s+visiblePhotos\s*=\s*alb\.photos\.filter\(photo=>S\.showVideoCoverPhotos\|\|!photo\._isVideoCover\)',
            r'openLB\(alb,\s*alb\.photos\.indexOf\(photo\)\)',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
