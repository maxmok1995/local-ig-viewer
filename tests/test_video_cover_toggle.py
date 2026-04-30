import re
import unittest
from pathlib import Path


class VideoCoverToggleTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (Path(__file__).resolve().parents[1] / 'local-ig.html').read_text(encoding='utf-8')

    def test_state_supports_video_cover_visibility_toggle(self):
        required_patterns = [
            r'showVideoCoverPhotos\s*:\s*false',
            r"localStorage\.getItem\('show-video-cover-photos'\)",
            r"localStorage\.setItem\('show-video-cover-photos'",
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_home_preview_bar_has_video_cover_toggle_button(self):
        required_patterns = [
            r'previewShowVideoCovers',
            r'homePreviewExtraBtn',
            r'S\.showVideoCoverPhotos',
            r'buildHomePreviewBar\(',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)

    def test_media_pairing_respects_video_cover_toggle(self):
        required_patterns = [
            r'function\s+shouldHideVideoCoverPhoto\s*\(',
            r'function\s+isVisibleHomePhoto\s*\(',
            r'cover\._isVideoCover\s*=\s*true',
            r'S\.showVideoCoverPhotos\|\|!photo\._isVideoCover',
        ]
        for pattern in required_patterns:
            self.assertIsNotNone(re.search(pattern, self.html, flags=re.S), msg=pattern)


if __name__ == '__main__':
    unittest.main()
